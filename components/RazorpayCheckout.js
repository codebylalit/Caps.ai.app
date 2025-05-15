import React from 'react';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '../config/razorpay';
import { createRazorpayOrder, verifyPayment } from '../config/razorpay';

export const initiatePayment = async (amount, options = {}) => {
  try {
    // First create order on the server
    const orderData = await createRazorpayOrder(amount);
    
    if (!orderData || !orderData.id) {
      throw new Error('Could not create order');
    }

    // Prepare Razorpay options
    const razorpayOptions = {
      key: RAZORPAY_KEY_ID,
      amount: amount.toString(), // Amount in smallest currency unit (paise for INR)
      currency: 'INR',
      name: options.name || 'Caps.ai',
      description: options.description || 'Payment for services',
      order_id: orderData.id,
      prefill: {
        email: options.email || '',
        contact: options.contact || '',
        name: options.userName || ''
      },
      theme: {
        color: options.themeColor || '#F37254'
      },
      send_sms_hash: true,
      allow_rotation: true
    };

    // Open Razorpay checkout
    const paymentData = await new Promise((resolve, reject) => {
      RazorpayCheckout.open(razorpayOptions)
        .then((data) => {
          console.log('Payment success:', data);
          resolve(data);
        })
        .catch((error) => {
          console.error('Payment error:', error);
          reject(error);
        });
    });

    // Verify payment signature
    const isVerified = await verifyPayment(paymentData);
    
    if (!isVerified) {
      throw new Error('Payment verification failed');
    }

    return {
      success: true,
      data: paymentData,
      orderId: orderData.id
    };

  } catch (error) {
    console.error('Payment failed:', error);
    return {
      success: false,
      error: error.message || 'Payment failed'
    };
  }
};

// Example usage component
export const RazorpayExample = () => {
  const handlePayment = async () => {
    try {
      const amount = 100 * 100; // ₹100 in paise
      const options = {
        name: 'Your Company Name',
        description: 'Test Payment',
        email: 'customer@example.com',
        contact: '9999999999',
        userName: 'John Doe',
        themeColor: '#F37254'
      };

      const result = await initiatePayment(amount, options);
      
      if (result.success) {
        console.log('Payment successful:', result.data);
        // Handle success (e.g., update UI, navigate to success screen)
      } else {
        console.error('Payment failed:', result.error);
        // Handle failure (e.g., show error message)
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Handle error
    }
  };

  return null; // This is just an example utility component
}; 