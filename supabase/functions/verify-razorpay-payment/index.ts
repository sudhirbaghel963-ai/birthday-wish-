import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const DEFAULT_FALLBACK_PRICE_INR = 100;

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
      .select('id, status, slug, razorpay_order_id, experience_id, theme_id, revises_gift_id, content, photo_urls, clip_urls, music')
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

    // 7. Look up dynamic experience price
    const expId = existingGift.experience_id || (existingGift.theme_id === 'glass' ? 'birthday-film-glass' : 'birthday-film');
    let pricePaidInr = DEFAULT_FALLBACK_PRICE_INR;

    const { data: expData } = await supabase
      .from('experiences')
      .select('price')
      .eq('id', expId)
      .maybeSingle();

    if (expData && expData.price) {
      const parsed = parseInt(String(expData.price).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        pricePaidInr = parsed;
      }
    }

    // 8. Handle Revision vs New Gift
    if (existingGift.revises_gift_id) {
      console.log(`[verify-razorpay-payment][${timestamp}] Draft ${giftId} is a revision of original gift ${existingGift.revises_gift_id}.`);

      // Fetch the original gift
      const { data: originalGift, error: origErr } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', existingGift.revises_gift_id)
        .maybeSingle();

      if (origErr || !originalGift) {
        console.error(`[verify-razorpay-payment][${timestamp}] Original gift ${existingGift.revises_gift_id} not found:`, origErr);
        return jsonResponse({ error: 'Original gift referenced by this revision was not found.' }, 404);
      }

      const prevVersion = originalGift.version || 1;
      const nextVersion = prevVersion + 1;

      // a. Archive previous state into gift_versions
      const { error: archiveErr } = await supabase
        .from('gift_versions')
        .insert({
          gift_id: originalGift.id,
          version_number: prevVersion,
          content: originalGift.content,
          photo_urls: originalGift.photo_urls || [],
          clip_urls: originalGift.clip_urls || [],
          music: originalGift.music || null,
          theme_id: originalGift.theme_id || null,
          experience_id: originalGift.experience_id || null,
          price_paid: originalGift.price_paid || null,
          razorpay_payment_id: originalGift.razorpay_payment_id || null,
          razorpay_order_id: originalGift.razorpay_order_id || null,
          published_at: originalGift.updated_at || originalGift.created_at || new Date().toISOString()
        });

      if (archiveErr) {
        console.warn(`[verify-razorpay-payment][${timestamp}] Notice: failed to archive version snapshot:`, archiveErr.message);
      }

      // b. Overwrite original gift with updated revision content & payment info
      const { data: updatedOriginal, error: updateOrigErr } = await supabase
        .from('gifts')
        .update({
          content: existingGift.content,
          photo_urls: existingGift.photo_urls || [],
          clip_urls: existingGift.clip_urls || [],
          music: existingGift.music || null,
          theme_id: existingGift.theme_id || originalGift.theme_id,
          experience_id: existingGift.experience_id || originalGift.experience_id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          price_paid: pricePaidInr,
          version: nextVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalGift.id)
        .select('id, status, slug, price_paid, version')
        .single();

      if (updateOrigErr || !updatedOriginal) {
        console.error(`[verify-razorpay-payment][${timestamp}] Failed updating original gift:`, updateOrigErr);
        return jsonResponse({ error: `Failed to update original gift: ${updateOrigErr?.message || 'Unknown error'}` }, 500);
      }

      // c. Delete temporary revision draft row
      await supabase
        .from('gifts')
        .delete()
        .eq('id', giftId)
        .eq('status', 'draft');

      console.log(`[verify-razorpay-payment][${timestamp}] Successfully verified and applied revision for gift ${originalGift.id} (version ${nextVersion})! Live slug: '${updatedOriginal.slug}'.`);

      return jsonResponse({
        success: true,
        is_revision: true,
        message: 'Payment verified and live gift updated successfully.',
        id: updatedOriginal.id,
        slug: updatedOriginal.slug,
        version: updatedOriginal.version,
        status: 'paid',
        price_paid: updatedOriginal.price_paid
      }, 200);
    }

    // 9. Standard New Gift Flow: Generate Unique 9-Character Slug
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

    // 10. Update New Gift Row to 'paid'
    const { data: updatedGift, error: updateErr } = await supabase
      .from('gifts')
      .update({
        status: 'paid',
        slug: chosenSlug,
        version: 1,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        price_paid: pricePaidInr,
        updated_at: new Date().toISOString()
      })
      .eq('id', giftId)
      .eq('status', 'draft') // Concurrency lock
      .select('id, status, slug, price_paid, version')
      .single();

    if (updateErr) {
      console.error(`[verify-razorpay-payment][${timestamp}] Database update error for ${giftId}:`, updateErr);
      return jsonResponse({ error: `Failed to update gift status: ${updateErr.message}` }, 500);
    }

    console.log(`[verify-razorpay-payment][${timestamp}] Gift ${giftId} successfully verified and paid! Slug: '${updatedGift.slug}', Price: ₹${updatedGift.price_paid}`);

    // 11. Return Verified Slug to Client
    return jsonResponse({
      success: true,
      is_revision: false,
      message: 'Payment verified and gift published successfully.',
      id: updatedGift.id,
      slug: updatedGift.slug,
      version: updatedGift.version,
      status: updatedGift.status,
      price_paid: updatedGift.price_paid
    }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[verify-razorpay-payment][${timestamp}] Unhandled error during verification:`, err);
    return jsonResponse({ error: `Internal Server Error: ${errorMsg}` }, 500);
  }
});
