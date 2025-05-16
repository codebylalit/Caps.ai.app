import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await req.json()

    // Verify all required fields are present
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required payment verification fields')
    }

    // Create the signature verification string
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    
    // Generate HMAC SHA256 signature
    const signature = createHmac('sha256', Deno.env.get('RAZORPAY_KEY_SECRET'))
      .update(text)
      .digest('hex')

    // Verify the signature
    const isValid = signature === razorpay_signature

    return new Response(
      JSON.stringify({ verified: isValid }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: isValid ? 200 : 400,
      },
    )

  } catch (error) {
    console.error('Verification Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    )
  }
})