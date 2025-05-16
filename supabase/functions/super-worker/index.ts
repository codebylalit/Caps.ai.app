/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "https://esm.sh/razorpay@2.9.2"

interface OrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes: {
    timestamp: string;
  };
}

interface RequestBody {
  amount: number;
  timestamp: string;
  action: string;
}

interface RazorpayError extends Error {
  statusCode?: number;
  metadata?: unknown;
  reason?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize Razorpay with environment variables
const initRazorpay = () => {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  
  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay credentials')
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  })
}

// Wrap Razorpay order creation in a timeout promise
const createOrderWithTimeout = async (razorpay: Razorpay, orderData: OrderData) => {
  const timeout = 25000 // 25 seconds timeout
  
  const orderPromise = razorpay.orders.create(orderData)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Razorpay API timeout')), timeout)
  })

  try {
    const startTime = Date.now()
    const result = await Promise.race([orderPromise, timeoutPromise])
    const endTime = Date.now()
    
    console.log(`Order creation took ${endTime - startTime}ms`)
    return result
  } catch (error) {
    if (error instanceof Error && error.message === 'Razorpay API timeout') {
      console.error(`Razorpay API call timed out after ${timeout}ms`)
    }
    throw error
  }
}

// Validate request body
const validateRequest = (body: unknown): { amount: number; timestamp: string } => {
  if (!body || typeof body !== 'object') {
    throw new Error('Missing request body')
  }

  const typedBody = body as RequestBody
  const { amount, timestamp, action } = typedBody
  
  if (action !== 'create_order') {
    throw new Error('Invalid action specified')
  }
  
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount provided')
  }
  
  if (!timestamp || typeof timestamp !== 'string') {
    throw new Error('Missing timestamp')
  }
  
  return { amount, timestamp }
}

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Request received:`, req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Razorpay instance
    const razorpay = initRazorpay()
    
    // Parse and validate request
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))
    
    const { amount, timestamp } = validateRequest(body)

    // Create order data
    const orderData: OrderData = {
      amount: Math.round(amount),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        timestamp: timestamp
      }
    }

    console.log('Creating Razorpay order:', JSON.stringify(orderData))

    // Create order with timeout handling
    const order = await createOrderWithTimeout(razorpay, orderData)
    console.log('Order created successfully:', JSON.stringify(order))

    return new Response(
      JSON.stringify({
        success: true,
        data: order
      }), 
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )

  } catch (error) {
    const typedError = error as RazorpayError
    console.error('Error details:', {
      message: typedError.message,
      stack: typedError.stack,
      name: typedError.name,
      statusCode: typedError.statusCode,
      metadata: typedError.metadata,
      reason: typedError.reason
    })

    const isRazorpayError = typedError.statusCode !== undefined
    const errorResponse = {
      success: false,
      error: {
        message: typedError.message,
        type: isRazorpayError ? 'razorpay_error' : 'server_error',
        code: typedError.statusCode || 500,
        details: {
          name: typedError.name,
          reason: typedError.reason,
          metadata: typedError.metadata
        }
      }
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: isRazorpayError ? typedError.statusCode || 500 : 500
      }
    )
  }
}) 