import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "https://esm.sh/razorpay@2.9.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const razorpay = new Razorpay({
  key_id: Deno.env.get('RAZORPAY_KEY_ID'),
  key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { amount, timestamp } = await req.json()
    
    console.log('Received request with amount:', amount)

    if (!amount || typeof amount !== 'number') {
      console.error('Invalid amount:', amount)
      throw new Error('Invalid amount provided')
    }

    // Validate Razorpay credentials
    if (!Deno.env.get('RAZORPAY_KEY_ID') || !Deno.env.get('RAZORPAY_KEY_SECRET')) {
      console.error('Missing Razorpay credentials')
      throw new Error('Razorpay configuration error')
    }

    // Create Razorpay order
    console.log('Creating Razorpay order for amount:', amount)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        timestamp: timestamp
      }
    })

    console.log('Order created successfully:', order)

    // Return the order details
    return new Response(
      JSON.stringify(order),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    // Determine if it's a Razorpay API error
    const isRazorpayError = error.statusCode !== undefined
    
    return new Response(
      JSON.stringify({
        error: error.message,
        type: isRazorpayError ? 'razorpay_error' : 'server_error',
        code: error.statusCode || 500
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: isRazorpayError ? error.statusCode : 500
      },
    )
  }
}) 