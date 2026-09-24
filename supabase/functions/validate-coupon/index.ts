import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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

serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ valid: false, reason: `Method ${req.method} not allowed. Expected POST.` }, 405);
  }

  const timestamp = new Date().toISOString();

  try {
    // 2. Read Server Configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[validate-coupon][${timestamp}] Missing Supabase server credentials.`);
      return jsonResponse({ valid: false, reason: 'Server configuration error.' }, 500);
    }

    // 3. Parse Request Payload
    let payload: { code?: string } = {};
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ valid: false, reason: 'Invalid JSON payload. Expected { code: "<string>" }.' }, 400);
    }

    const rawCode = payload.code;
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return jsonResponse({ valid: false, reason: 'Please enter a coupon code.' }, 400);
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // 4. Initialize Database Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 5. Look up Coupon
    const { data: coupon, error: fetchErr } = await supabase
      .from('coupons')
      .select('id, code, discount_percent, max_uses, times_used, expires_at, is_active')
      .eq('code', cleanCode)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[validate-coupon][${timestamp}] Database query error for ${cleanCode}:`, fetchErr);
      return jsonResponse({ valid: false, reason: 'Database error occurred while validating coupon.' }, 500);
    }

    if (!coupon) {
      return jsonResponse({ valid: false, reason: 'Invalid coupon code.' }, 400);
    }

    // 6. Check Active Status
    if (!coupon.is_active) {
      return jsonResponse({ valid: false, reason: 'This coupon code is currently inactive.' }, 400);
    }

    // 7. Check Expiration Date
    if (coupon.expires_at) {
      const expiryDate = new Date(coupon.expires_at);
      if (!isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
        return jsonResponse({ valid: false, reason: 'This coupon code has expired.' }, 400);
      }
    }

    // 8. Check Usage Limit
    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return jsonResponse({ valid: false, reason: 'This coupon has reached its usage limit.' }, 400);
    }

    console.log(`[validate-coupon][${timestamp}] Coupon '${coupon.code}' successfully validated (${coupon.discount_percent}% off, used ${coupon.times_used}/${coupon.max_uses || '∞'}).`);

    // 9. Return Successful Validation
    return jsonResponse({
      valid: true,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      message: `${coupon.discount_percent}% discount applied successfully!`
    }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[validate-coupon][${timestamp}] Unhandled error:`, err);
    return jsonResponse({ valid: false, reason: 'An unexpected server error occurred.' }, 500);
  }
});
