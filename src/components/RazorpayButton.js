import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, Linking, Alert, Platform } from 'react-native';
import tw from 'twrnc';
import { RAZORPAY_KEY_ID } from '../config/razorpay';
import RazorpayService from '../src/services/razorpay.ts';

const RazorpayButton = ({
  plan,
  amount,
  onSuccess,
  disabled = false,
  style = {},
  user,
  supabase
}) => {
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState(null);

  useEffect(() => {
    let subscription;
    
    const setupDeepLinkHandling = async () => {
      if (transactionId) {
        try {
          // Check if app was opened with a deep link
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            processDeepLink(initialUrl);
          }

          // Modern approach for deep link handling
          if (Platform.OS === 'android') {
            subscription = Linking.addEventListener('url', ({ url }) => {
              if (url) {
                processDeepLink(url);
              }
            });
          } else {
            // iOS handling
            Linking.addEventListener('url', ({ url }) => {
              if (url) {
                processDeepLink(url);
              }
            });
          }
        } catch (err) {
          console.error('Error setting up deep link handling:', err);
        }
      }
    };

    setupDeepLinkHandling();

    // Cleanup function
    return () => {
      if (Platform.OS === 'android' && subscription) {
        subscription.remove();
      }
    };
  }, [transactionId]);

  const processDeepLink = async (url) => {
    try {
      if (!transactionId) return;

      if (url.includes('payment/success')) {
        const urlObj = new URL(url);
        const paymentId = urlObj.searchParams.get('razorpay_payment_id');
        const orderId = urlObj.searchParams.get('razorpay_order_id');
        const signature = urlObj.searchParams.get('razorpay_signature');

        if (!paymentId || !orderId || !signature) {
          throw new Error('Invalid payment response received');
        }

        // Update payment status to processing
        const { error: updateError } = await supabase
          .from("payments")
          .update({ 
            status: "processing",
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature
          })
          .eq("transaction_id", transactionId);

        if (updateError) {
          throw new Error('Failed to update payment status');
        }

        // Verify the payment
        const isVerified = await RazorpayService.verifyPayment({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature
        });

        if (isVerified) {
          // Update payment status to success
          await supabase
            .from("payments")
            .update({ 
              status: "success",
              verified: true
            })
            .eq("transaction_id", transactionId);

          onSuccess(plan);
          Alert.alert(
            "Payment Successful",
            "Your payment has been processed successfully!",
            [{ text: "OK" }]
          );
        } else {
          throw new Error('Payment verification failed');
        }
      } else if (url.includes('payment/failure')) {
        // Update payment status to failed
        await supabase
          .from("payments")
          .update({ 
            status: "failed",
            error_description: "Payment cancelled or failed",
            verified: false
          })
          .eq("transaction_id", transactionId);

        Alert.alert(
          "Payment Failed",
          "The payment was cancelled or failed. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      
      // Update payment status to failed with error details
      await supabase
        .from("payments")
        .update({ 
          status: "failed",
          error_description: error.message || "Payment verification failed",
          verified: false
        })
        .eq("transaction_id", transactionId);

      Alert.alert(
        "Payment Error",
        error.message || "There was an error processing your payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setTransactionId(null);
      setLoading(false);
    }
  };

  const generateTransactionId = () => {
    return "TXN_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  };

  const handlePayment = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to make a payment");
      return;
    }

    setLoading(true);
    const txnId = generateTransactionId();
    setTransactionId(txnId);

    try {
      // Create a pending transaction in the database
      const { error: paymentInitError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: amount,
          credits: parseInt(plan),
          transaction_id: txnId,
          status: "pending",
          credits_added: false,
        });

      if (paymentInitError) {
        throw new Error('Failed to initialize payment');
      }

      // Create a Razorpay order
      const orderData = await RazorpayService.createOrder({
        amount: amount * 100, // Convert to smallest currency unit
        currency: 'INR',
        receipt: txnId,
        notes: {
          plan,
          userId: user.id
        }
      });

      if (!orderData?.id) {
        throw new Error('Failed to create payment order');
      }

      // Initialize payment
      await RazorpayService.initiatePayment({
        amount: amount * 100,
        orderId: orderData.id,
        currency: 'INR',
        description: `${plan} Credits Purchase`,
        email: user.email,
        contact: user.phone || '',
        name: user.name || '',
        businessName: 'Caps.ai'
      });

    } catch (error) {
      console.error('Payment error:', error);
      
      // Always update payment status to failed when there's an error
      await supabase
        .from("payments")
        .update({ 
          status: "failed", 
          error_description: error.message || 'Unknown error',
          verified: false 
        })
        .eq("transaction_id", txnId);

      Alert.alert(
        "Payment Error",
        error.message || "There was an error initiating the payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setTransactionId(null);
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        tw`bg-indigo-600 p-4 rounded-xl shadow-sm`,
        disabled || loading ? tw`opacity-50` : {},
        style
      ]}
      onPress={handlePayment}
      disabled={disabled || loading}
    >
      <Text style={tw`text-white text-center font-medium`}>
        {loading ? 'Processing...' : 'Pay with Razorpay'}
      </Text>
    </TouchableOpacity>
  );
};

export default RazorpayButton;