import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
  BackHandler,
  NativeEventEmitter,
  NativeModules,
} from "react-native";
import tw from "twrnc";
import { RAZORPAY_KEY_ID } from '../../config/razorpay';
import RazorpayService from '../../src/services/razorpay.ts';

let RazorpayCheckout;
let razorpayEvents;
if (Platform.OS === 'android') {
  RazorpayCheckout = require('react-native-razorpay').default;
  const RazorpayEventEmitter = NativeModules.RazorpayEventEmitter;
  if (RazorpayEventEmitter) {
    razorpayEvents = new NativeEventEmitter(RazorpayEventEmitter);
  }
}

const creditPackages = [
  { credits: 50, price: 9, popular: false, discount: false, label: "Starter" },
  {
    credits: 250, price: 29, originalPrice: 50,
    popular: true, discount: true, savings: "₹21", label: "Best Value"
  },
  { credits: 500, price: 99, popular: false, discount: false, label: "Pro Pack" },
];

const PaymentManager = ({ user, supabase, credits = 0, fetchUserCredits, setActiveMode }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionId, setTransactionId] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    fetchTransactions();

    // Handle hardware back button press during payment
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) return true;
      return false;
    });

    // Initialize Razorpay event listeners (Android only)
    let paymentSuccessListener;
    let paymentErrorListener;
    let externalWalletListener;

    if (Platform.OS === 'android' && razorpayEvents) {
      paymentSuccessListener = razorpayEvents.addListener(
        'Razorpay::PAYMENT_SUCCESS',
        handlePaymentSuccess
      );
      paymentErrorListener = razorpayEvents.addListener(
        'Razorpay::PAYMENT_ERROR',
        handlePaymentError
      );
      externalWalletListener = razorpayEvents.addListener(
        'Razorpay::EXTERNAL_WALLET_SELECTED',
        handleExternalWallet
      );
    }

    // Setup deep link handling
    let deepLinkSubscription = null;
    
    const setupDeepLinkHandling = async () => {
      if (transactionId) {
        // Modern approach for Linking event listener
        deepLinkSubscription = Linking.addEventListener('url', ({ url }) => {
          if (url) {
            processDeepLink(url);
          }
        });
        
        // Check if app was opened via deep link
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            processDeepLink(initialUrl);
          }
        } catch (err) {
          console.error('Error getting initial URL:', err);
        }
      }
    };

    setupDeepLinkHandling();

    // Cleanup function
    return () => {
      backHandler.remove();
      
      // Clean up deep link listener
      if (deepLinkSubscription) {
        deepLinkSubscription.remove();
      }

      // Clean up Razorpay event listeners
      if (Platform.OS === 'android' && razorpayEvents) {
        if (paymentSuccessListener) {
          paymentSuccessListener.remove();
        }
        if (paymentErrorListener) {
          paymentErrorListener.remove();
        }
        if (externalWalletListener) {
          externalWalletListener.remove();
        }
      }
    };
  }, [transactionId, loading]);

  const handlePaymentSuccess = async (data) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = data;
      
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new Error('Invalid payment response');
      }

      console.log('Processing payment success:', {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
      
      // Update payment status to processing
      await supabase.from("payments")
        .update({
          status: "processing",
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        })
        .eq("transaction_id", transactionId);

      console.log('Starting payment verification...');
      const verificationResult = await RazorpayService.verifyPayment({
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      });

      console.log('Payment verification result:', verificationResult);

      if (verificationResult) {
        console.log('Payment verified successfully');
        
        // The Edge Function has already:
        // 1. Updated payment status to success
        // 2. Added credits to the user's account
        
        // Refresh the UI
        await fetchUserCredits();
        await fetchTransactions();
        
        Alert.alert(
          "Payment Successful",
          "Your credits have been added to your account!",
          [{
            text: "OK",
            onPress: () => {
              // Redirect to generator screen
              setActiveMode(null);
            }
          }]
        );
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert(
        "Payment Error",
        error.message || "There was an error processing your payment.",
        [{ text: "OK" }]
      );
      
      // Update payment status to failed
      await supabase.from("payments")
        .update({
          status: "failed",
          error_description: error.message || "Verification failed",
          verified: false
        })
        .eq("transaction_id", transactionId);
    } finally {
      setTransactionId(null);
      setProcessingPlan(null);
      setLoading(false);
    }
  };

  const processDeepLink = async (url) => {
    if (!transactionId) return;
    
    try {
      const urlObj = new URL(url);
      const paymentId = urlObj.searchParams.get('razorpay_payment_id');
      const orderId = urlObj.searchParams.get('razorpay_order_id');
      const signature = urlObj.searchParams.get('razorpay_signature');

      if (paymentId && orderId && signature) {
        await supabase.from("payments")
          .update({
            status: "processing",
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature
          })
          .eq("transaction_id", transactionId);

        const isVerified = await RazorpayService.verifyPayment({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature
        });

        if (isVerified) {
          await supabase.from("payments")
            .update({ status: "success", verified: true })
            .eq("transaction_id", transactionId);

          handleSuccessfulPayment(processingPlan);
        } else {
          throw new Error('Payment verification failed');
        }
      } else if (url.includes('payment/failure') || url.includes('payment/cancel')) {
        await supabase.from("payments")
          .update({ 
            status: "failed", 
            error_description: url.includes('payment/cancel') ? "Payment cancelled" : "Payment failed",
            verified: false 
          })
          .eq("transaction_id", transactionId);

        Alert.alert(
          url.includes('payment/cancel') ? "Payment Cancelled" : "Payment Failed", 
          url.includes('payment/cancel') ? "The payment was cancelled." : "The payment failed. Please try again.", 
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      Alert.alert("Payment Error", error.message || "There was an error processing your payment.", [{ text: "OK" }]);
      
      await supabase.from("payments")
        .update({ 
          status: "failed", 
          error_description: error.message || "Verification failed", 
          verified: false 
        })
        .eq("transaction_id", transactionId);
    } finally {
      setTransactionId(null);
      setProcessingPlan(null);
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
      setTransactions([]);
    }
  };

  const generateTransactionId = () => {
    return "TXN_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  };

  const handleExternalWallet = (data) => {
    console.log('External Wallet Selected:', data);
  };

  const handlePaymentError = async (error) => {
    console.error("Payment error details:", error);
    
    if (transactionId) {
      await supabase.from("payments")
        .update({ 
          status: "failed", 
          error_description: error?.description || error?.message || "Payment failed",
          verified: false 
        })
        .eq("transaction_id", transactionId);
    }

    if (error?.code !== 0) {
      Alert.alert("Payment Failed", error?.description || error?.message || "Payment failed", [{ text: "OK" }]);
    }

    setTransactionId(null);
    setProcessingPlan(null);
    setLoading(false);
  };

  const handleSuccessfulPayment = async (plan) => {
    try {
      setLoading(true);

      const selectedPackage = creditPackages.find(pkg => pkg.credits === parseInt(plan));
      if (!selectedPackage) throw new Error('Invalid credit package');

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const newTotal = (userData?.credits || 0) + selectedPackage.credits;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newTotal })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await Promise.all([fetchUserCredits(), fetchTransactions()]);

      Alert.alert(
        "Success", 
        `${selectedPackage.credits} credits added to your account`,
        [
          { 
            text: "OK",
            onPress: () => {
              // Redirect to generator screen
              setActiveMode(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", error.message || "Failed to add credits.", [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (plan, amount) => {
    if (!user) {
      Alert.alert("Error", "Please log in to make a payment");
      return;
    }

    setLoading(true);
    const txnId = generateTransactionId();
    setTransactionId(txnId);
    setProcessingPlan(plan);

    try {
      const { error: paymentInitError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount,
          credits: parseInt(plan),
          transaction_id: txnId,
          status: "pending",
          credits_added: false,
        });

      if (paymentInitError) throw new Error('Failed to initialize payment');

      const orderData = await RazorpayService.createOrder({
        amount: amount * 100,
        currency: 'INR',
        receipt: txnId,
        notes: { plan, userId: user.id }
      });

      if (!orderData?.id) throw new Error('Failed to create payment order');

      console.log('Starting payment with order:', orderData.id);
      
      const paymentData = await RazorpayService.initiatePayment({
        amount: amount * 100,
        orderId: orderData.id,
        currency: 'INR',
        description: `${plan} Credits Purchase`,
        email: user.email,
        contact: user.phone || '',
        name: user.name || ''
      });

      console.log('Payment successful:', paymentData);

      // Handle the payment success
      await handlePaymentSuccess({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature
      });

    } catch (error) {
      console.error('Payment error:', error);
      setTransactionId(null);
      setProcessingPlan(null);

      await supabase
        .from("payments")
        .update({ 
          status: "failed", 
          error_description: error.message || 'Unknown error', 
          verified: false 
        })
        .eq("transaction_id", txnId);

      Alert.alert("Payment Error", error.message || "Failed to start payment", [{ text: "OK" }]);
    } finally {
      if (!transactionId) setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 px-4 py-3`}>
      <View style={tw`bg-white rounded-2xl p-6 shadow-sm mb-6`}>
        <Text style={tw`text-2xl font-bold text-slate-800 text-center mb-2`}>{credits}</Text>
        <Text style={tw`text-base text-slate-600 text-center`}>Available Credits</Text>
      </View>

      <Text style={tw`text-lg font-semibold text-slate-800 mb-4`}>Buy Credits</Text>
      <View style={tw`mb-6`}>
        {creditPackages.map((pkg, index) => {
          const originalPrice = pkg.discount ? pkg.originalPrice : pkg.price;
          const savings = pkg.discount ? originalPrice - pkg.price : 0;

          return (
            <TouchableOpacity
              key={index}
              style={tw`bg-white p-4 rounded-xl shadow-sm m-1 ${pkg.popular ? "border-2 border-orange-500" : ""} ${loading ? "opacity-70" : ""}`}
              onPress={() => handlePayment(pkg.credits.toString(), pkg.price)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={tw`flex-row justify-between items-center`}>
                <View>
                  <Text style={tw`text-lg font-semibold text-slate-800`}>{pkg.credits} Credits</Text>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-base text-slate-600`}>₹{pkg.price}</Text>
                    {pkg.discount && (
                      <Text style={tw`text-sm text-slate-400 line-through ml-2`}>₹{originalPrice}</Text>
                    )}
                  </View>
                  {pkg.discount && (
                    <Text style={tw`text-sm text-green-600 mt-1`}>Save ₹{savings}!</Text>
                  )}
                </View>
                <View style={tw`flex items-end`}>
                  {pkg.label && (
                    <View style={tw`bg-orange-100 px-3 py-1 rounded-full mb-2`}>
                      <Text style={tw`text-orange-600 font-medium`}>{pkg.label}</Text>
                    </View>
                  )}
                  {pkg.discount && (
                    <View style={tw`bg-orange-100 px-3 py-1 rounded-2xl mt-2`}>
                      <Text style={tw`text-red-600 font-medium`}>50% Off</Text>
                    </View>
                  )}
                </View>
              </View>
              {loading && processingPlan === pkg.credits.toString() && (
                <View style={tw`mt-3 bg-indigo-100 p-2 rounded-lg`}>
                  <Text style={tw`text-indigo-600 text-center font-medium`}>Processing...</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={tw`text-lg font-semibold text-slate-800 mb-4`}>Transaction History</Text>
      <View style={tw`mb-6`}>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <View key={index} style={tw`bg-white p-4 rounded-xl shadow-sm mb-2`}>
              <View style={tw`flex-row justify-between items-center`}>
                <View>
                  <Text style={tw`text-base font-medium text-slate-800`}>{transaction.credits} Credits</Text>
                  <Text style={tw`text-sm text-slate-600`}>₹{transaction.amount}</Text>
                </View>
                <View>
                  <Text style={tw`${transaction.status === "success" ? "text-green-600" : transaction.status === "pending" ? "text-yellow-600" : "text-red-600"} text-sm font-medium`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Text>
                  <Text style={tw`text-xs text-slate-500`}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={tw`bg-white p-4 rounded-xl shadow-sm`}>
            <Text style={tw`text-center text-slate-600`}>No transaction history found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PaymentManager;