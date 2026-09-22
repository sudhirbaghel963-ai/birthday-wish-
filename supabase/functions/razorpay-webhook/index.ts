import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Single Flat Price across all experiences & themes: ₹100 = 10,000 paise
 */
export const FLAT_PRICE_INR = 100;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const timestamp = new Date().toISOString();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[razorpay-webhook][${timestamp}] Missing Supabase server credentials.`);
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    // Read raw body for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // If webhook secret is configured, verify HMAC signature
    if (webhookSecret) {
      if (!signature) {
        console.warn(`[razorpay-webhook][${timestamp}] Missing x-razorpay-signature header.`);
        return jsonResponse({ error: 'Missing webhook signature' }, 400);
      }

      const expectedSig = await computeHmacSha256(rawBody, webhookSecret);
      if (!timingSafeEqual(expectedSig.toLowerCase(), signature.toLowerCase())) {
        console.warn(`[razorpay-webhook][${timestamp}] Invalid webhook signature.`);
        return jsonResponse({ error: 'Invalid webhook signature' }, 400);
      }
    }

    let eventData: Record<string, any> = {};
    try {
      eventData = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Malformed JSON payload' }, 400);
    }

    const event = eventData.event;
    console.log(`[razorpay-webhook][${timestamp}] Received Razorpay event: ${event}`);

    // Process payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = eventData.payload?.payment?.entity;
      const order = eventData.payload?.order?.entity;
      
      const orderId = payment?.order_id || order?.id;
      const paymentId = payment?.id;
      const giftId = payment?.notes?.gift_id || order?.notes?.gift_id;

      if (!orderId && !giftId) {
        console.warn(`[razorpay-webhook][${timestamp}] No order_id or gift_id found in event.`);
        return jsonResponse({ status: 'ignored' }, 200);
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Find gift by giftId or razorpay_order_id
      let query = supabase.from('gifts').select('id, status, slug, revises_gift_id, content, photo_urls, clip_urls, music, theme_id, experience_id, version');
      if (giftId) {
        query = query.eq('id', giftId);
      } else if (orderId) {
        query = query.eq('razorpay_order_id', orderId);
      }

      const { data: gift, error: fetchErr } = await query.maybeSingle();

      if (fetchErr || !gift) {
        console.warn(`[razorpay-webhook][${timestamp}] Gift not found for order ${orderId} / gift ${giftId}`);
        return jsonResponse({ status: 'gift_not_found' }, 200);
      }

      if (gift.status === 'paid') {
        console.log(`[razorpay-webhook][${timestamp}] Gift ${gift.id} is already marked paid.`);
        return jsonResponse({ status: 'already_paid', slug: gift.slug }, 200);
      }

      // If this is a revision of an already-paid gift
      if (gift.revises_gift_id) {
        const { data: originalGift } = await supabase
          .from('gifts')
          .select('*')
          .eq('id', gift.revises_gift_id)
          .maybeSingle();

        if (originalGift) {
          const prevVer = originalGift.version || 1;
          const nextVer = prevVer + 1;

          // 1. Archive previous state into gift_versions
          await supabase.from('gift_versions').insert({
            gift_id: originalGift.id,
            version_number: prevVer,
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

          // 2. Update original gift
          await supabase.from('gifts').update({
            content: gift.content,
            photo_urls: gift.photo_urls || [],
            clip_urls: gift.clip_urls || [],
            music: gift.music || null,
            theme_id: gift.theme_id || originalGift.theme_id,
            experience_id: gift.experience_id || originalGift.experience_id,
            razorpay_order_id: orderId || null,
            razorpay_payment_id: paymentId || null,
            version: nextVer,
            updated_at: new Date().toISOString()
          }).eq('id', originalGift.id);

          // 3. Delete revision draft
          await supabase.from('gifts').delete().eq('id', gift.id).eq('status', 'draft');
          console.log(`[razorpay-webhook][${timestamp}] Successfully verified and applied revision for gift ${originalGift.id} (version ${nextVer}) via webhook.`);
          return jsonResponse({ status: 'success', is_revision: true, slug: originalGift.slug }, 200);
        }
      }

      // Generate slug and transition for new gift
      let chosenSlug = '';
      for (let attempt = 1; attempt <= 5; attempt++) {
        const candidate = generateRandomSlug(9);
        const { data: coll } = await supabase.from('gifts').select('id').eq('slug', candidate).maybeSingle();
        if (!coll) {
          chosenSlug = candidate;
          break;
        }
      }

      if (chosenSlug) {
        await supabase
          .from('gifts')
          .update({
            status: 'paid',
            slug: chosenSlug,
            version: 1,
            razorpay_order_id: orderId || null,
            razorpay_payment_id: paymentId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', gift.id)
          .eq('status', 'draft');

        console.log(`[razorpay-webhook][${timestamp}] Successfully updated gift ${gift.id} to paid via webhook.`);
      }
    }

    return jsonResponse({ status: 'success' }, 200);

  } catch (err: unknown) {
    console.error(`[razorpay-webhook][${timestamp}] Webhook handler error:`, err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
