import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { initiatePayment } from '../services/razorpay';

interface PaymentButtonProps {
  amount: number;
  packageName: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  packageName,
  onSuccess,
  onError,
  userEmail,
  userPhone,
  userName,
}) => {
  const handlePayment = async () => {
    try {
      // First, create an order from your backend
      const orderResponse = await fetch('YOUR_BACKEND_URL/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          action: 'create_order',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const { data: orderData } = await orderResponse.json();

      // Initialize payment
      const result = await initiatePayment({
        amount: amount,
        currency: 'INR',
        description: `Purchase ${packageName} Package`,
        name: 'Your App Name',
        orderId: orderData.id,
        prefill: {
          email: userEmail,
          contact: userPhone,
          name: userName,
        },
        theme: {
          color: '#2B6EFD', // Primary color
        },
      });

      // Verify payment with backend
      const verificationResponse = await fetch('YOUR_BACKEND_URL/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.data),
      });

      if (!verificationResponse.ok) {
        throw new Error('Payment verification failed');
      }

      // Call success callback
      onSuccess?.(result.data);
      Alert.alert('Success', 'Payment completed successfully!');

    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error instanceof Error ? error : new Error('Payment failed'));
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Payment failed. Please try again.'
      );
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePayment}>
      <Text style={styles.buttonText}>
        Pay ₹{amount}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2B6EFD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 