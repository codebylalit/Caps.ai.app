export const RAZORPAY_KEY_ID = "rzp_live_m1qfDdgI9r1AGQ";

const SUPABASE_PROJECT_REF = 'zkojmfnmjqqvbrtbteyu';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2ptZm5tanFxdmJydGJ0ZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg0MjIsImV4cCI6MjA2Mjc5NDQyMn0.uXfP4z5Z-5PikE84xwEUXP9BqIgt1sZXl_-mvz7n_ZE';

export const createRazorpayOrder = async (amount) => {
  const finalAmount = Math.round(amount); // assuming amount is in INR
  console.log('Creating Razorpay order for amount (in paise):', finalAmount);
  console.log('Using Supabase URL:', SUPABASE_URL);
  console.log('Using Supabase Anon Key:', SUPABASE_ANON_KEY);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    console.log('Sending request to super-worker with payload:', {
      amount: finalAmount,
      timestamp: new Date().toISOString(),
      action: 'create_order',
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/super-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        amount: finalAmount,
        timestamp: new Date().toISOString(),
        action: 'create_order',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const rawText = await response.text();
    console.log('Raw response:', rawText);

    if (!rawText) {
      throw new Error('Empty response from server');
    }

    const data = JSON.parse(rawText);

    if (!response.ok || data.error) {
      const errorMsg = data?.error || 'Failed to create order';
      const errorType = data?.type || 'unknown_error';
      throw new Error(`${errorType}: ${errorMsg}`);
    }

    if (!data.id) {
      throw new Error('Invalid order response: missing order ID');
    }

    console.log('Successfully created Razorpay order:', data.id);
    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error('Timeout error:', error);
      throw new Error('Server timeout. Please try again.');
    }

    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    ) {
      throw new Error('Network error. Please check your internet connection.');
    }

    console.error('Error creating Razorpay order:', error);
    throw new Error(error.message || 'Unexpected error creating Razorpay order.');
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