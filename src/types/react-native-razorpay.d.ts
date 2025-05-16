declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    key: string;
    amount: number;
    currency?: string;
    name: string;
    description?: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    image?: string;
  }

  interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayError extends Error {
    code?: string;
    description?: string;
    metadata?: any;
  }

  const RazorpayCheckout: {
    open: (options: RazorpayOptions) => Promise<RazorpayResponse>;
  };

  export default RazorpayCheckout;
} 