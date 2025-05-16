import React, { useState } from 'react';
import { TouchableOpacity, Text, Platform } from 'react-native';
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

  const handlePayment = async () => {
    if (!user) {
      // Handle not logged in state
      return;
    }

    setLoading(true);

    try {
      // Create a Razorpay order
      const orderData = await RazorpayService.createOrder({
        amount: amount * 100, // Convert to smallest currency unit
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: {
          plan,
          userId: user.id
        }
      });

      if (!orderData?.id) {
        throw new Error('Failed to create payment order');
      }

      // Initialize payment
      const paymentResponse = await RazorpayService.initiatePayment({
        amount: amount * 100,
        orderId: orderData.id,
        currency: 'INR',
        description: `${plan} Plan Subscription`,
        email: user.email,
        contact: user.phone,
        name: user.name
      });

      // Handle successful payment
      await handlePaymentSuccess(paymentResponse);

    } catch (error) {
      console.error('Payment error:', error);
      // Handle payment error
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentResponse) => {
    try {
      // Verify payment signature
      const isVerified = await RazorpayService.verifyPayment(paymentResponse);
      
      if (!isVerified) {
        throw new Error('Payment verification failed');
      }

      // Call the success callback
      onSuccess(plan);

    } catch (error) {
      console.error('Payment verification error:', error);
      // Handle verification error
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