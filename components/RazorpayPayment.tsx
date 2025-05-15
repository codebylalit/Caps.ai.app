import React, { useState } from 'react';
import { loadScript } from '../utils/loadScript';

// Import the Razorpay key from config
import { RAZORPAY_KEY_ID } from '../config/razorpay';

interface PaymentProps {
  amount: number;
  onSuccess: (response: any) => void;
  onError: (error: any) => void;
  customerDetails?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

const SUPABASE_PROJECT_URL = 'https://zkojmfnmjqqvbrtbteyu.supabase.co';

export const RazorpayPayment: React.FC<PaymentProps> = ({
  amount,
  onSuccess,
  onError,
  customerDetails = {}
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // 1. Load Razorpay SDK
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        throw new Error('Razorpay SDK failed to load');
      }

      // 2. Create order using Supabase Edge Function
      const orderResponse = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/super-worker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // 3. Initialize Razorpay payment
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Your Company Name',
        description: 'Payment for your service',
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // 4. Verify payment
            const verificationResponse = await fetch(
              `${SUPABASE_PROJECT_URL}/functions/v1/verify-razorpay`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verificationData = await verificationResponse.json();

            if (!verificationResponse.ok || !verificationData.verified) {
              throw new Error('Payment verification failed');
            }

            onSuccess({
              ...response,
              verified: true,
              orderId: orderData.id,
            });
          } catch (error) {
            onError(error);
          }
        },
        prefill: {
          name: customerDetails.name || '',
          email: customerDetails.email || '',
          contact: customerDetails.contact || '',
        },
        theme: {
          color: '#528FF0',
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
}; 