import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Single Flat Price across all experiences & themes: ₹100 = 10,000 paise
 */
export const FLAT_PRICE_INR = 100;
export const FLAT_PRICE_PAISE = 10000;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';

function generateRandomSlug(length = 9): string {
  let slug = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    slug += SLUG_CHARS[randomValues[i] % SLUG_CHARS.length];
  }
  return slug;
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Computes HMAC-SHA256 hex digest of data using key
 */
async function computeHmacSha256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: `Method ${req.method} not allowed. Expected POST.` }, 405);
  }

  const timestamp = new Date().toISOString();

  try {
    // 2. Read Server-side Configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[verify-razorpay-payment][${timestamp}] Missing Supabase server credentials.`);
      return jsonResponse({ error: 'Server configuration error: Supabase credentials missing.' }, 500);
    }

    if (!razorpayKeySecret) {
      console.error(`[verify-razorpay-payment][${timestamp}] Missing RAZORPAY_KEY_SECRET.`);
      return jsonResponse({ error: 'Server configuration error: Razorpay Key Secret missing.' }, 500);
    }

    // 3. Parse Payload
    let payload: {
      gift_id?: string;
      id?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = {};

    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload in request body.' }, 400);
    }

    const giftId = (payload.gift_id || payload.id || '').trim();
    const orderId = (payload.razorpay_order_id || '').trim();
    const paymentId = (payload.razorpay_payment_id || '').trim();
    const signature = (payload.razorpay_signature || '').trim();

    if (!giftId || !UUID_REGEX.test(giftId)) {
      return jsonResponse({ error: `Invalid gift ID: '${giftId}'. Must be a valid UUID.` }, 400);
    }

    if (!orderId || !paymentId || !signature) {
      return jsonResponse({
        error: "Missing required verification fields: 'razorpay_order_id', 'razorpay_payment_id', and 'razorpay_signature'."
      }, 400);
    }

    console.log(`[verify-razorpay-payment][${timestamp}] Verifying payment for gift ${giftId}, order ${orderId}, payment ${paymentId}`);

    // 4. Cryptographic HMAC-SHA256 Signature Verification
    const expectedSignature = await computeHmacSha256(`${orderId}|${paymentId}`, razorpayKeySecret);
    const isSignatureValid = timingSafeEqual(expectedSignature.toLowerCase(), signature.toLowerCase());

    if (!isSignatureValid) {
      console.warn(`[verify-razorpay-payment][${timestamp}] Invalid signature for order ${orderId}. Expected ${expectedSignature}, received ${signature}`);
      return jsonResponse({
        error: 'Payment verification failed: cryptographic signature mismatch. The transaction could not be verified.'
      }, 400);
    }

    console.log(`[verify-razorpay-payment][${timestamp}] Signature valid for gift ${giftId}. Proceeding to status transition.`);

    // 5. Initialize Service-Role Database Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 6. Fetch Existing Gift Row
    const { data: existingGift, error: fetchErr } = await supabase
      .from('gifts')
      .select('id, status, slug, razorpay_order_id')
      .eq('id', giftId)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[verify-razorpay-payment][${timestamp}] Database lookup error:`, fetchErr);
      return jsonResponse({ error: `Database lookup error: ${fetchErr.message}` }, 500);
    }

    if (!existingGift) {
      return jsonResponse({ error: `Gift with id '${giftId}' not found.` }, 404);
    }

    // Idempotent return if already marked paid
    if (existingGift.status === 'paid' && existingGift.slug) {
      console.log(`[verify-razorpay-payment][${timestamp}] Gift ${giftId} is already paid. Returning slug '${existingGift.slug}'.`);
      return jsonResponse({
        success: true,
        already_paid: true,
        slug: existingGift.slug,
        id: existingGift.id
      }, 200);
    }

    // 7. Generate Unique 9-Character Slug
    const MAX_SLUG_ATTEMPTS = 5;
    let chosenSlug = '';
    let isUnique = false;

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = generateRandomSlug(9);
      const { data: collCheck } = await supabase
        .from('gifts')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (!collCheck) {
        chosenSlug = candidate;
        isUnique = true;
        break;
      }
    }

    if (!isUnique || !chosenSlug) {
      return jsonResponse({ error: 'Could not generate a unique public slug. Please retry.' }, 500);
    }

    // 8. Update Gift Row to 'paid'
    const { data: updatedGift, error: updateErr } = await supabase
      .from('gifts')
      .update({
        status: 'paid',
        slug: chosenSlug,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        price_paid: FLAT_PRICE_INR, // Fixed flat price: ₹100.00
        updated_at: new Date().toISOString()
      })
      .eq('id', giftId)
      .eq('status', 'draft') // Concurrency lock
      .select('id, status, slug, price_paid')
      .single();

    if (updateErr) {
      console.error(`[verify-razorpay-payment][${timestamp}] Database update error for ${giftId}:`, updateErr);
      return jsonResponse({ error: `Failed to update gift status: ${updateErr.message}` }, 500);
    }

    console.log(`[verify-razorpay-payment][${timestamp}] Gift ${giftId} successfully verified and paid! Slug: '${updatedGift.slug}', Price: ₹${updatedGift.price_paid}`);

    // 9. Return Verified Slug to Client
    return jsonResponse({
      success: true,
      message: 'Payment verified and gift published successfully.',
      id: updatedGift.id,
      slug: updatedGift.slug,
      status: updatedGift.status,
      price_paid: updatedGift.price_paid
    }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[verify-razorpay-payment][${timestamp}] Unhandled error during verification:`, err);
    return jsonResponse({ error: `Internal Server Error: ${errorMsg}` }, 500);
  }
});
