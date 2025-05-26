import { Platform } from 'react-native';
import { RAZORPAY_KEY_ID } from '../../config/razorpay';

// Define the type for RazorpayCheckout
interface RazorpayCheckoutStatic {
  open: (options: RazorpayOptions) => Promise<RazorpaySuccessResponse>;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    email: string;
    contact: string;
    name: string;
  };
  theme?: {
    color: string;
  };
  send_sms_hash?: boolean;
  remember_customer?: boolean;
  external?: {
    wallets: string[];
  };
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

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
  businessName?: string;
}

// Initialize RazorpayCheckout with proper typing
let RazorpayCheckout: RazorpayCheckoutStatic | undefined;
try {
  if (Platform.OS === 'android') {
    RazorpayCheckout = require('react-native-razorpay').default;
  } else if (Platform.OS === 'ios') {
    RazorpayCheckout = require('react-native-razorpay').default;
  }
} catch (error) {
  console.error('Failed to initialize Razorpay:', error);
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
    if (!RazorpayCheckout) {
      throw new Error('Razorpay SDK not initialized');
    }

    const razorpayOptions: RazorpayOptions = {
      key: RAZORPAY_KEY_ID,
      amount: options.amount,
      currency: options.currency,
      name: options.businessName || 'Caps.ai',
      description: options.description,
      order_id: options.orderId,
      prefill: {
        email: options.email,
        contact: options.contact,
        name: options.name
      },
      theme: {
        color: '#FB923B'
      },
      send_sms_hash: true,
      remember_customer: true,
      external: {
        wallets: ['paytm', 'gpay', 'phonepe']
      }
    };

    try {
      console.log('Opening Razorpay with options:', razorpayOptions);
      const data = await RazorpayCheckout.open(razorpayOptions);
      console.log('Razorpay payment successful:', data);
      return data;
    } catch (error) {
      console.error('Payment error:', error);
      throw error;
    }
  }

  static async verifyPayment(paymentData: RazorpaySuccessResponse) {
    try {
      console.log('Verifying payment with data:', {
        order_id: paymentData.razorpay_order_id,
        payment_id: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature
      });
      
      // Add retry logic with exponential backoff
      const maxRetries = 3;
      let retryCount = 0;
      let lastError: any = null;
      
      while (retryCount < maxRetries) {
        try {
          const response = await fetch('https://zkojmfnmjqqvbrtbteyu.supabase.co/functions/v1/verify-razorpay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE'
            },
            body: JSON.stringify({
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_signature: paymentData.razorpay_signature
            })
          });

          const responseText = await response.text();
          console.log('Raw verification response:', responseText);

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse verification response:', parseError);
            throw new Error('Invalid response from verification server');
          }

          if (!response.ok) {
            console.error('Verification failed with status:', response.status);
            console.error('Error response:', data);
            throw new Error(data.error || 'Payment verification failed');
          }

          console.log('Verification result:', data);
          return data.verified === true;
          
        } catch (error) {
          lastError = error;
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Exponential backoff: wait 2^retryCount * 1000 milliseconds
            const delayMs = Math.pow(2, retryCount) * 1000;
            console.log(`Verification attempt ${retryCount} failed. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      // If we've exhausted all retries, throw the last error
      console.error(`Payment verification failed after ${maxRetries} attempts:`, lastError);
      throw lastError;

    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }
}

export default RazorpayService;