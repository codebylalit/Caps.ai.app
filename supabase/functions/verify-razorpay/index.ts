import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RazorpayVerificationPayload {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

console.log("Starting verify-razorpay function...")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured')
    }

    // Get the request payload
    const payload: RazorpayVerificationPayload = await req.json()
    console.log('Received payload:', payload)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required parameters')
    }

    // Create the verification data string
    const message = `${razorpay_order_id}|${razorpay_payment_id}`
    
    // Create HMAC SHA256 instance with the secret key
    const hmac = createHmac('sha256', RAZORPAY_KEY_SECRET)
    hmac.update(message)
    const generated_signature = hmac.digest('hex')

    console.log('Verifying signatures:', {
      received: razorpay_signature,
      generated: generated_signature
    })

    // Verify the signature
    const isValid = generated_signature === razorpay_signature

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (isValid) {
      console.log('Signature verified, processing payment...')

      // First, find the payment record by status "pending" and razorpay_order_id
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .eq('razorpay_order_id', razorpay_order_id)
        .single()

      if (paymentError) {
        console.error('Payment fetch error:', paymentError)
        throw new Error('Payment record not found or multiple records found')
      }

      if (!paymentData) {
        throw new Error('Payment record not found')
      }

      console.log('Found payment record:', paymentData)

      // Update payment status to success
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({
          status: 'success',
          verified: true,
          credits_added: true,
          razorpay_payment_id,
          razorpay_signature
        })
        .eq('id', paymentData.id)

      if (updateError) {
        console.error('Payment update error:', updateError)
        throw updateError
      }

      // Get user's current credits
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('credits')
        .eq('id', paymentData.user_id)
        .single()

      if (userError) {
        console.error('User fetch error:', userError)
        throw userError
      }

      // Add the new credits to user's account
      const currentCredits = userData?.credits || 0
      const newCredits = currentCredits + paymentData.credits

      const { error: creditError } = await supabaseClient
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', paymentData.user_id)

      if (creditError) {
        console.error('Credits update error:', creditError)
        throw creditError
      }

      console.log('Payment verification successful:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        credits_added: paymentData.credits,
        new_total_credits: newCredits
      })

      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Payment verification successful',
          credits_added: paymentData.credits,
          total_credits: newCredits
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      console.error('Payment verification failed:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      })

      return new Response(
        JSON.stringify({
          verified: false,
          message: 'Payment verification failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
  } catch (error: any) {
    console.error('Error in verify-razorpay function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        verified: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 