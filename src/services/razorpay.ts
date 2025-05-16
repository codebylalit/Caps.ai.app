import { Platform, Linking } from 'react-native';
import { RAZORPAY_KEY_ID } from '../../config/razorpay';

interface OrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes?: {
    [key: string]: string;
  };
}

interface PaymentOptions {
  amount: number;
  orderId: string;
  currency: string;
  description: string;
  email: string;
  contact: string;
  name: string;
}

class RazorpayService {
  static async createOrder(orderData: OrderData) {
    try {
      const response = await fetch('https://zkojmfnmjqqvbrtbteyu.supabase.co/functions/v1/super-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE'
        },
        body: JSON.stringify({
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          receipt: orderData.receipt,
          notes: orderData.notes,
          action: 'create_order',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create order: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  static async initiatePayment(options: PaymentOptions) {
    try {
      const paymentUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${RAZORPAY_KEY_ID}&amount=${options.amount}&currency=${options.currency}&order_id=${options.orderId}&name=Caps.ai&description=${options.description}&prefill[email]=${options.email}&prefill[contact]=${options.contact}&prefill[name]=${options.name}&theme[color]=#53a20e`;
      
      // Open payment URL in browser
      await Linking.openURL(paymentUrl);
      
      return new Promise((resolve) => {
        // Handle the payment response through deep linking
        const handleUrl = ({ url }: { url: string }) => {
          if (url.includes('payment_success')) {
            resolve({ success: true });
          } else if (url.includes('payment_failure')) {
            resolve({ success: false });
          }
        };

        Linking.addEventListener('url', handleUrl as any);
      });
    } catch (error) {
      console.error('Error in initiatePayment:', error);
      throw error;
    }
  }

  static async verifyPayment(paymentData: any) {
    try {
      const response = await fetch('https://zkojmfnmjqqvbrtbteyu.supabase.co/functions/v1/verify-razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE'
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      return data.verified;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }
}

export default RazorpayService;