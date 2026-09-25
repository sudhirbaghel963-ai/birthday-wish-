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
    // 2. Read Server-side Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[create-razorpay-order][${timestamp}] Missing Supabase server configuration.`);
      return jsonResponse({ error: 'Server configuration error: Supabase credentials missing.' }, 500);
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error(`[create-razorpay-order][${timestamp}] Missing Razorpay API keys.`);
      return jsonResponse({ 
        error: 'Razorpay payment gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server.' 
      }, 500);
    }

    // 3. Parse Request Payload
    let payload: { id?: string; gift_id?: string; coupon_code?: string; customer_id?: string } = {};
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload. Expected { gift_id: "<uuid>", coupon_code?: "<string>" }.' }, 400);
    }

    const giftId = (payload.gift_id || payload.id || '').trim();
    if (!giftId || !UUID_REGEX.test(giftId)) {
      return jsonResponse({ error: `Invalid or missing gift ID: '${giftId}'. Must be a valid UUID.` }, 400);
    }

    const rawCouponCode = payload.coupon_code ? String(payload.coupon_code).trim().toUpperCase() : null;

    // 4. Initialize Service-Role Database Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 5. Fetch Draft Gift
    const { data: gift, error: fetchErr } = await supabase
      .from('gifts')
      .select('id, status, slug, content, experience_id, theme_id, revises_gift_id, owner_id')
      .eq('id', giftId)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[create-razorpay-order][${timestamp}] Database lookup error for ${giftId}:`, fetchErr);
      return jsonResponse({ error: `Database error: ${fetchErr.message}` }, 500);
    }

    if (!gift) {
      return jsonResponse({ error: `Gift with id '${giftId}' not found.` }, 404);
    }

    // If gift is already paid, return existing state
    if (gift.status === 'paid' && gift.slug) {
      return jsonResponse({
        success: true,
        already_paid: true,
        slug: gift.slug,
        message: 'This gift has already been paid for and published.',
      }, 200);
    }

    // 6. Look up dynamic Per-Experience Base Price from experiences table
    const targetExpId = gift.experience_id || (gift.theme_id === 'glass' ? 'birthday-film-glass' : 'birthday-film');
    let basePriceInInr = DEFAULT_FALLBACK_PRICE_INR;

    const { data: expRow, error: expErr } = await supabase
      .from('experiences')
      .select('id, price, name')
      .eq('id', targetExpId)
      .maybeSingle();

    if (expRow && expRow.price) {
      const rawNum = parseInt(String(expRow.price).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(rawNum) && rawNum >= 1) {
        basePriceInInr = rawNum;
      }
    } else if (expErr) {
      console.warn(`[create-razorpay-order][${timestamp}] Could not lookup experience ${targetExpId}, falling back to default ₹${DEFAULT_FALLBACK_PRICE_INR}:`, expErr.message);
    }

    // 7. Check if Customer is Eligible for Automatic 10% Referral Discount
    // Re-check freshly from database: referred_by_influencer_id is set AND referral_commission_granted is false
    const customerUserId = payload.customer_id || gift.owner_id || null;
    let isReferralEligible = false;

    if (customerUserId) {
      const { data: customerProfile, error: profErr } = await supabase
        .from('customer_profiles')
        .select('id, email, referred_by_influencer_id, referral_commission_granted')
        .eq('id', customerUserId)
        .maybeSingle();

      if (!profErr && customerProfile) {
        if (customerProfile.referred_by_influencer_id && customerProfile.referral_commission_granted === false) {
          isReferralEligible = true;
          console.log(`[create-razorpay-order][${timestamp}] Customer ${customerUserId} is eligible for 10% first-purchase referral discount.`);
        }
      }
    }

    // 8. Re-validate Manual Coupon Server-Side (if provided)
    let validCoupon: { code: string; discount_percent: number } | null = null;

    if (rawCouponCode) {
      const { data: coupon, error: couponErr } = await supabase
        .from('coupons')
        .select('id, code, discount_percent, max_uses, times_used, expires_at, is_active')
        .eq('code', rawCouponCode)
        .maybeSingle();

      if (couponErr || !coupon) {
        return jsonResponse({ error: `Coupon code '${rawCouponCode}' is invalid.` }, 400);
      }

      if (!coupon.is_active) {
        return jsonResponse({ error: `Coupon code '${rawCouponCode}' is currently inactive.` }, 400);
      }

      if (coupon.expires_at) {
        const expiryDate = new Date(coupon.expires_at);
        if (!isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
          return jsonResponse({ error: `Coupon code '${rawCouponCode}' has expired.` }, 400);
        }
      }

      if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
        return jsonResponse({ error: `Coupon code '${rawCouponCode}' has reached its usage limit.` }, 400);
      }

      validCoupon = {
        code: coupon.code,
        discount_percent: coupon.discount_percent
      };
    }

    // 9. Interaction between Referral Discount and Manual Coupon — DO NOT STACK
    // Apply whichever discount is LARGER. Single discount type applies to a purchase.
    const referralDiscountPercent = isReferralEligible ? 10 : 0;
    const couponDiscountPercent = validCoupon ? validCoupon.discount_percent : 0;

    let appliedDiscountPercent: number | null = null;
    let appliedDiscountSource: 'referral' | 'coupon' | null = null;
    let appliedCouponCode: string | null = null;

    if (couponDiscountPercent > referralDiscountPercent) {
      // Manual coupon gives a strictly larger discount (e.g. 20% coupon vs 10% referral)
      appliedDiscountPercent = couponDiscountPercent;
      appliedDiscountSource = 'coupon';
      appliedCouponCode = validCoupon!.code;
    } else if (referralDiscountPercent > 0) {
      // Referral discount is greater than or equal to coupon (e.g. 10% referral >= 5% coupon or no coupon)
      appliedDiscountPercent = referralDiscountPercent; // 10
      appliedDiscountSource = 'referral';
      appliedCouponCode = null; // Referral discount was used, not coupon
    } else if (couponDiscountPercent > 0) {
      // Customer is not referral-eligible, but has valid coupon
      appliedDiscountPercent = couponDiscountPercent;
      appliedDiscountSource = 'coupon';
      appliedCouponCode = validCoupon!.code;
    }

    // Calculate final price (minimum ₹1)
    let finalPriceInInr = basePriceInInr;
    if (appliedDiscountPercent !== null && appliedDiscountPercent > 0) {
      const discounted = Math.round(basePriceInInr * (1 - appliedDiscountPercent / 100));
      finalPriceInInr = Math.max(1, discounted);
    }

    console.log(`[create-razorpay-order][${timestamp}] Price calculation: Base: ₹${basePriceInInr}, ReferralEligible: ${isReferralEligible} (10%), Coupon: ${validCoupon ? `${validCoupon.code} (${validCoupon.discount_percent}%)` : 'none'} -> Applied: ${appliedDiscountSource || 'none'} (${appliedDiscountPercent || 0}%), Final: ₹${finalPriceInInr}`);

    const amountInPaise = finalPriceInInr * 100;
    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // 10. Create Razorpay Order via REST API
    const rzpOrderPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${giftId.substring(0, 18)}`,
      notes: {
        gift_id: giftId,
        revises_gift_id: gift.revises_gift_id || null,
        experience_id: targetExpId,
        experience_name: (expRow && expRow.name) || targetExpId,
        recipient: (gift.content && typeof gift.content === 'object' && gift.content.recipientName) || 'Elena',
        coupon_code: appliedCouponCode || 'NONE',
        discount_source: appliedDiscountSource || 'NONE',
        discount_percent: appliedDiscountPercent !== null ? `${appliedDiscountPercent}%` : '0%',
        original_price_inr: basePriceInInr,
        final_price_inr: finalPriceInInr,
        platform: 'Velvet & Keepsake'
      }
    };

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(rzpOrderPayload)
    });

    if (!rzpResponse.ok) {
      const rzpErrBody = await rzpResponse.text();
      console.error(`[create-razorpay-order][${timestamp}] Razorpay Orders API error (${rzpResponse.status}):`, rzpErrBody);
      return jsonResponse({
        error: `Payment gateway order creation failed (${rzpResponse.status}). Please verify Razorpay keys and retry.`
      }, 502);
    }

    const rzpOrder = await rzpResponse.json();
    const orderId = rzpOrder.id;

    // 11. Store razorpay_order_id, coupon_code, discount_percent, discount_source, and price_paid on Gift Row
    const { error: updateErr } = await supabase
      .from('gifts')
      .update({
        razorpay_order_id: orderId,
        experience_id: targetExpId,
        coupon_code: appliedCouponCode,
        discount_percent: appliedDiscountPercent,
        discount_source: appliedDiscountSource,
        price_paid: finalPriceInInr,
        updated_at: new Date().toISOString()
      })
      .eq('id', giftId);

    if (updateErr) {
      console.warn(`[create-razorpay-order][${timestamp}] Could not record razorpay_order_id on gift row:`, updateErr);
    }

    console.log(`[create-razorpay-order][${timestamp}] Created Razorpay Order ${orderId} for gift ${giftId} [Experience: ${targetExpId}, Base: ₹${basePriceInInr}, Final: ₹${finalPriceInInr} / ${amountInPaise} paise, Source: ${appliedDiscountSource || 'none'}].`);

    // 12. Return Order ID and Config to Client
    return jsonResponse({
      success: true,
      order_id: orderId,
      amount: amountInPaise,
      amount_inr: finalPriceInInr,
      base_price_inr: basePriceInInr,
      coupon_code: appliedCouponCode,
      discount_percent: appliedDiscountPercent,
      discount_source: appliedDiscountSource,
      currency: 'INR',
      key_id: razorpayKeyId
    }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[create-razorpay-order][${timestamp}] Unhandled error:`, err);
    return jsonResponse({ error: `Internal Server Error: ${errorMsg}` }, 500);
  }
});
