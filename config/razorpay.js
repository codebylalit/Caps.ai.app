export const RAZORPAY_KEY_ID = 'rzp_test_NrIiKYuezOw2aL';

const SUPABASE_PROJECT_REF = 'zkojmfnmjqqvbrtbteyu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE';

export const createRazorpayOrder = async (amount) => {
  try {
    console.log('Creating order with amount:', amount);
    
    // Create AbortController with 30 second timeout instead of 60
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${SUPABASE_URL}/functions/v1/super-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        amount: Math.round(amount), // Ensure amount is an integer
        timestamp: new Date().toISOString() 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    let data;
    try {
      const text = await response.text();
      console.log('Raw response:', text);
      
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      data = JSON.parse(text);
      console.log('Parsed response:', data);
      
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error(`Invalid response from server: ${parseError.message}`);
    }
    
    if (!response.ok || data.error) {
      console.error('Error response:', data);
      
      // Handle specific error types
      if (data.type === 'razorpay_error') {
        throw new Error(`Razorpay error: ${data.error}`);
      } else if (data.type === 'server_error') {
        throw new Error(`Server error: ${data.error}`);
      } else {
        throw new Error(data.error || 'Failed to create order');
      }
    }
    
    if (!data.id) {
      console.error('Invalid order response:', data);
      throw new Error('Invalid order response: missing order ID');
    }
    
    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout error:', error);
      throw new Error('Request timed out after 30 seconds. Please check your internet connection and try again.');
    }
    
    console.error('Error creating Razorpay order:', error);
    console.error('Full error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data
    });
    
    throw error; // Rethrow the error to be handled by the caller
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    console.log('Verifying payment with data:', {
      orderId: paymentData.razorpay_order_id,
      paymentId: paymentData.razorpay_payment_id,
      signature: paymentData.razorpay_signature
    });
    
    // Create AbortController with 30 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    let data;
    try {
      const text = await response.text();
      console.log('Raw verification response:', text);
      
      if (!text) {
        throw new Error('Empty response from verification server');
      }
      
      data = JSON.parse(text);
      console.log('Parsed verification response:', data);
      
    } catch (parseError) {
      console.error('Failed to parse verification response:', parseError);
      throw new Error(parseError.message || 'Invalid response from verification server');
    }
    
    if (!response.ok || data.error) {
      console.error('Verification error response:', data);
      throw new Error(data.error || 'Payment verification failed');
    }
    
    if (!data.verified) {
      throw new Error('Payment signature verification failed');
    }
    
    return data.verified;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Verification timeout error:', error);
      throw new Error('Payment verification timed out. Please check your payment status.');
    }
    
    console.error('Error verifying payment:', error);
    console.error('Full verification error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data
    });
    
    throw new Error(error.message || 'Unable to verify payment. Please contact support.');
  }
}; 