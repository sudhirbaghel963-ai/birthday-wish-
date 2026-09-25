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
      customer_id?: string;
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
      .select('id, owner_id, status, slug, razorpay_order_id, experience_id, theme_id, revises_gift_id, content, photo_urls, clip_urls, music, coupon_code, discount_percent, discount_source, price_paid')
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

    // 7. Look up dynamic experience base price (ORIGINAL price)
    const expId = existingGift.experience_id || (existingGift.theme_id === 'glass' ? 'birthday-film-glass' : 'birthday-film');
    let basePriceInr = DEFAULT_FALLBACK_PRICE_INR;

    const { data: expData } = await supabase
      .from('experiences')
      .select('price')
      .eq('id', expId)
      .maybeSingle();

    if (expData && expData.price) {
      const parsed = parseInt(String(expData.price).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        basePriceInr = parsed;
      }
    }

    // Calculate effective price paid taking any applied discount into account
    let pricePaidInr = basePriceInr;
    if (existingGift.discount_percent) {
      const discounted = Math.round(basePriceInr * (1 - existingGift.discount_percent / 100));
      pricePaidInr = Math.max(1, discounted);
    } else if (existingGift.price_paid) {
      pricePaidInr = existingGift.price_paid;
    }

    // 8. Atomically Increment Coupon Usage on Confirmed Payment (if a coupon discount was applied)
    if (existingGift.coupon_code && (existingGift.discount_source === 'coupon' || !existingGift.discount_source)) {
      try {
        const { data: incRes, error: incErr } = await supabase.rpc('increment_coupon_usage', {
          p_code: existingGift.coupon_code
        });

        if (incErr) {
          console.error(`[verify-razorpay-payment][${timestamp}] Failed to increment coupon usage for '${existingGift.coupon_code}':`, incErr);
        } else if (incRes && incRes.success) {
          console.log(`[verify-razorpay-payment][${timestamp}] Coupon '${incRes.code}' usage incremented: now ${incRes.times_used}/${incRes.max_uses || '∞'}.`);

          if (incRes.max_uses !== null && incRes.times_used > incRes.max_uses) {
            console.warn(`[verify-razorpay-payment][${timestamp}] [EDGE CASE ALERT] Coupon '${incRes.code}' usage limit (${incRes.max_uses}) was exceeded at final confirmation for gift ${giftId}. Honoring confirmed payment.`);
          }
        }
      } catch (couponIncEx) {
        console.error(`[verify-razorpay-payment][${timestamp}] Exception during coupon increment:`, couponIncEx);
      }
    }

    // Helper function to process influencer commission on CUSTOMER'S FIRST PAID GIFT ONLY
    // NOTE: Commission is ALWAYS calculated on original/base price (basePriceInr), NOT discounted price_paid!
    async function processInfluencerCommission(targetGiftId: string, customerUserId: string | null, originalBasePrice: number) {
      if (!customerUserId || originalBasePrice <= 0) return;
      try {
        // 1. Fetch customer profile to check account-level referral attribution and first-purchase status
        const { data: profile, error: profErr } = await supabase
          .from('customer_profiles')
          .select('id, email, referred_by_influencer_id, referral_commission_granted')
          .eq('id', customerUserId)
          .maybeSingle();

        if (profErr) {
          console.warn(`[verify-razorpay-payment][${timestamp}] Error fetching customer profile for user ${customerUserId}:`, profErr);
          return;
        }

        if (!profile) {
          console.log(`[verify-razorpay-payment][${timestamp}] No customer profile found for user ${customerUserId}. Skipping commission.`);
          return;
        }

        // 2. Only the customer's FIRST paid gift counts. If already granted, skip!
        if (profile.referral_commission_granted) {
          console.log(`[verify-razorpay-payment][${timestamp}] User ${customerUserId} has already generated their first-purchase commission. Skipping.`);
          return;
        }

        if (!profile.referred_by_influencer_id) {
          console.log(`[verify-razorpay-payment][${timestamp}] User ${customerUserId} was not referred by any influencer.`);
          return;
        }

        const influencerId = profile.referred_by_influencer_id;

        // 3. Verify influencer is active
        const { data: influencer, error: infErr } = await supabase
          .from('influencers')
          .select('id, user_id, email, status')
          .eq('id', influencerId)
          .maybeSingle();

        if (infErr || !influencer) {
          console.warn(`[verify-razorpay-payment][${timestamp}] Influencer ${influencerId} not found:`, infErr);
          return;
        }

        if (influencer.status !== 'active') {
          console.warn(`[verify-razorpay-payment][${timestamp}] Influencer ${influencerId} is inactive/suspended (${influencer.status}). Skipping commission.`);
          return;
        }

        // 4. Self-referral check: skip if customer user_id or email matches influencer
        if (
          (influencer.user_id && customerUserId === influencer.user_id) ||
          (profile.email && influencer.email && profile.email.toLowerCase().trim() === influencer.email.toLowerCase().trim())
        ) {
          console.log(`[verify-razorpay-payment][${timestamp}] Self-referral detected for user ${customerUserId}. Skipping commission.`);
          return;
        }

        // 5. Commission is strictly 20% of the ORIGINAL BASE price (never the discounted price)
        const commissionAmount = Math.round(originalBasePrice * 0.20 * 100) / 100;

        // 6. Velocity check: flag suspicious if >= 3 orders for this influencer in the past 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from('commissions')
          .select('id', { count: 'exact', head: true })
          .eq('influencer_id', influencer.id)
          .gte('created_at', oneHourAgo);

        const isSuspicious = !countErr && typeof count === 'number' && count >= 3;
        const suspiciousReason = isSuspicious ? `High velocity: ${count + 1} orders within 1 hour` : null;

        // Check if commission already exists for this gift to avoid duplicate
        const { data: existingComm } = await supabase
          .from('commissions')
          .select('id')
          .eq('gift_id', targetGiftId)
          .maybeSingle();

        if (existingComm) {
          console.log(`[verify-razorpay-payment][${timestamp}] Commission already exists for gift ${targetGiftId}.`);
          return;
        }

        const { error: commInsertErr } = await supabase
          .from('commissions')
          .insert({
            gift_id: targetGiftId,
            influencer_id: influencer.id,
            amount: commissionAmount,
            status: 'pending',
            is_suspicious: isSuspicious,
            suspicious_reason: suspiciousReason,
          });

        if (commInsertErr) {
          console.error(`[verify-razorpay-payment][${timestamp}] Error recording commission:`, commInsertErr);
        } else {
          console.log(`[verify-razorpay-payment][${timestamp}] Commission of ₹${commissionAmount} (20% of base ₹${originalBasePrice}) recorded for influencer ${influencer.id} (gift: ${targetGiftId}, suspicious: ${isSuspicious}).`);

          // 7. Mark referral_commission_granted = true on the customer's profile so NO future purchases generate discounts or commissions
          const { error: profUpdateErr } = await supabase
            .from('customer_profiles')
            .update({
              referral_commission_granted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', customerUserId);

          if (profUpdateErr) {
            console.error(`[verify-razorpay-payment][${timestamp}] Failed to set referral_commission_granted on customer profile:`, profUpdateErr);
          } else {
            console.log(`[verify-razorpay-payment][${timestamp}] Marked referral_commission_granted = true for user ${customerUserId}.`);
          }
        }
      } catch (ex) {
        console.error(`[verify-razorpay-payment][${timestamp}] Exception processing influencer commission:`, ex);
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
          coupon_code: originalGift.coupon_code || null,
          discount_percent: originalGift.discount_percent || null,
          discount_source: originalGift.discount_source || null,
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
          coupon_code: existingGift.coupon_code || null,
          discount_percent: existingGift.discount_percent || null,
          discount_source: existingGift.discount_source || null,
          version: nextVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalGift.id)
        .select('id, owner_id, status, slug, price_paid, version')
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

      // d. Record Commission on first paid gift if customer was referred (20% of basePriceInr)
      const revisionCustomerUid = payload.customer_id || existingGift.owner_id || originalGift.owner_id;
      await processInfluencerCommission(originalGift.id, revisionCustomerUid, basePriceInr);

      console.log(`[verify-razorpay-payment][${timestamp}] Successfully verified and applied revision for gift ${originalGift.id} (version ${nextVersion})! Live slug: '${updatedOriginal.slug}', Paid: ₹${updatedOriginal.price_paid}.`);

      return jsonResponse({
        success: true,
        is_revision: true,
        message: 'Payment verified and live gift updated successfully.',
        id: updatedOriginal.id,
        slug: updatedOriginal.slug,
        version: updatedOriginal.version,
        status: 'paid',
        price_paid: updatedOriginal.price_paid,
        coupon_code: existingGift.coupon_code || null,
        discount_percent: existingGift.discount_percent || null,
        discount_source: existingGift.discount_source || null
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
        coupon_code: existingGift.coupon_code || null,
        discount_percent: existingGift.discount_percent || null,
        discount_source: existingGift.discount_source || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', giftId)
      .eq('status', 'draft') // Concurrency lock
      .select('id, owner_id, status, slug, price_paid, version')
      .single();

    if (updateErr) {
      console.error(`[verify-razorpay-payment][${timestamp}] Database update error for ${giftId}:`, updateErr);
      return jsonResponse({ error: `Failed to update gift status: ${updateErr.message}` }, 500);
    }

    // 11. Record Commission on first paid gift if customer was referred (20% of basePriceInr)
    const customerUid = payload.customer_id || existingGift.owner_id || updatedGift.owner_id;
    await processInfluencerCommission(updatedGift.id, customerUid, basePriceInr);

    console.log(`[verify-razorpay-payment][${timestamp}] Gift ${giftId} successfully verified and paid! Slug: '${updatedGift.slug}', Paid: ₹${updatedGift.price_paid} (Base: ₹${basePriceInr})`);

    // 12. Return Verified Slug to Client
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
