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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateRandomSlug(length = 9): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let slug = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) slug += chars[randomValues[i] % chars.length];
  return slug;
}

// SHA-256 helper (same algorithm as the browser admin login)
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const ADMIN_EMAIL = 'sudhirbaghel963@gmail.com';
// SHA-256 of 'Qwerty#2005'
const ADMIN_PASSWORD_HASH = 'afd7cdde817e605ec8f2450842ccc89eec2166d4542cf4d195709bf4dc083d63';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const timestamp = new Date().toISOString();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Server configuration error.' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Parse body
    let payload: { gift_id?: string; admin_email?: string; admin_password?: string } = {};
    try { payload = await req.json(); } catch {
      return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
    }

    const { gift_id, admin_email, admin_password } = payload;

    // --- ADMIN VERIFICATION ---
    // Must supply email + password matching the single hardcoded admin
    if (!admin_email || !admin_password) {
      return jsonResponse({ error: 'Admin credentials are required.' }, 401);
    }

    const suppliedHash = await sha256(admin_password);
    if (
      admin_email.toLowerCase().trim() !== ADMIN_EMAIL ||
      suppliedHash !== ADMIN_PASSWORD_HASH
    ) {
      console.warn(`[publish-admin-gift][${timestamp}] Unauthorized admin attempt: ${admin_email}`);
      return jsonResponse({ error: 'Unauthorized: invalid admin credentials.' }, 403);
    }

    // Also confirm email is in admin_users table as a secondary check
    const { data: adminRow, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('email', ADMIN_EMAIL)
      .eq('password_hash', ADMIN_PASSWORD_HASH)
      .maybeSingle();

    if (adminErr || !adminRow) {
      console.warn(`[publish-admin-gift][${timestamp}] Admin not found in DB.`);
      return jsonResponse({ error: 'Unauthorized: admin account not found.' }, 403);
    }

    // --- VALIDATE GIFT ID ---
    if (!gift_id || typeof gift_id !== 'string') {
      return jsonResponse({ error: "Missing required parameter 'gift_id'." }, 400);
    }
    const cleanId = gift_id.trim();
    if (!UUID_REGEX.test(cleanId)) {
      return jsonResponse({ error: `Invalid gift ID format: '${cleanId}'.` }, 400);
    }

    console.log(`[publish-admin-gift][${timestamp}] Admin publishing gift: ${cleanId}`);

    // --- FETCH GIFT ---
    const { data: gift, error: fetchError } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchError) return jsonResponse({ error: `DB error: ${fetchError.message}` }, 500);
    if (!gift) return jsonResponse({ error: `Gift '${cleanId}' not found.` }, 404);

    // Idempotency: already paid
    if (gift.status === 'paid' && !gift.revises_gift_id) {
      return jsonResponse({
        success: true,
        is_admin: true,
        already_published: true,
        message: 'Gift is already published.',
        id: gift.id,
        slug: gift.slug,
        version: gift.version || 1,
        price_paid: gift.price_paid,
      });
    }

    // --- REVISION FLOW ---
    if (gift.revises_gift_id) {
      const originalId = gift.revises_gift_id;

      // Fetch original live gift
      const { data: origGift, error: origErr } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', originalId)
        .maybeSingle();

      if (origErr || !origGift) {
        return jsonResponse({ error: 'Original gift for revision not found.' }, 404);
      }

      const currentVersion = origGift.version || 1;

      // Archive original into gift_versions
      const { error: archiveErr } = await supabase
        .from('gift_versions')
        .insert({
          gift_id: originalId,
          version_number: currentVersion,
          content: origGift.content,
          photo_urls: origGift.photo_urls || [],
          clip_urls: origGift.clip_urls || [],
          music: origGift.music || {},
          theme_id: origGift.theme_id,
          experience_id: origGift.experience_id,
          price_paid: origGift.price_paid || 0,
          razorpay_payment_id: origGift.razorpay_payment_id,
          razorpay_order_id: origGift.razorpay_order_id,
          published_at: origGift.updated_at || origGift.created_at,
        });

      if (archiveErr) {
        console.error(`[publish-admin-gift][${timestamp}] Archive error:`, archiveErr);
        return jsonResponse({ error: `Failed to archive version: ${archiveErr.message}` }, 500);
      }

      // Update original gift with revision content
      const { data: updated, error: updateErr } = await supabase
        .from('gifts')
        .update({
          content: gift.content,
          photo_urls: gift.photo_urls || [],
          clip_urls: gift.clip_urls || [],
          music: gift.music || {},
          theme_id: gift.theme_id,
          experience_id: gift.experience_id,
          status: 'paid',
          price_paid: 0,
          razorpay_payment_id: 'admin_complimentary',
          razorpay_order_id: `admin_free_${Date.now()}`,
          razorpay_signature: 'admin_complimentary',
          version: currentVersion + 1,
          revises_gift_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalId)
        .select('id, slug, version, status, price_paid')
        .single();

      if (updateErr) {
        return jsonResponse({ error: `Failed to update original gift: ${updateErr.message}` }, 500);
      }

      // Delete the temporary revision draft
      await supabase.from('gifts').delete().eq('id', cleanId);

      console.log(`[publish-admin-gift][${timestamp}] Admin revision published: ${originalId} → v${updated.version}`);
      return jsonResponse({
        success: true,
        is_admin: true,
        is_revision: true,
        message: 'Admin revision published successfully.',
        id: updated.id,
        slug: updated.slug,
        version: updated.version,
        price_paid: 0,
      });
    }

    // --- FRESH PUBLISH FLOW ---
    if (gift.status !== 'draft') {
      return jsonResponse({ error: `Gift cannot be published (status: '${gift.status}').` }, 400);
    }

    // Generate unique slug
    const MAX_SLUG_ATTEMPTS = 5;
    let chosenSlug = '';
    let isUnique = false;
    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = generateRandomSlug(9);
      const { data: collision } = await supabase
        .from('gifts').select('id').eq('slug', candidate).maybeSingle();
      if (!collision) { chosenSlug = candidate; isUnique = true; break; }
    }
    if (!isUnique) return jsonResponse({ error: 'Could not generate unique slug.' }, 500);

    const { data: published, error: pubErr } = await supabase
      .from('gifts')
      .update({
        status: 'paid',
        slug: chosenSlug,
        price_paid: 0,
        razorpay_payment_id: 'admin_complimentary',
        razorpay_order_id: `admin_free_${Date.now()}`,
        razorpay_signature: 'admin_complimentary',
        version: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanId)
      .eq('status', 'draft')
      .select('id, status, slug, version, price_paid')
      .single();

    if (pubErr) return jsonResponse({ error: `Failed to publish: ${pubErr.message}` }, 500);

    console.log(`[publish-admin-gift][${timestamp}] Admin published new gift: ${cleanId} slug=${published.slug}`);
    return jsonResponse({
      success: true,
      is_admin: true,
      is_revision: false,
      message: 'Gift published for free (admin privilege).',
      id: published.id,
      slug: published.slug,
      version: published.version,
      price_paid: 0,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[publish-admin-gift][${timestamp}] Unhandled error:`, err);
    return jsonResponse({ error: `Internal Server Error: ${msg}` }, 500);
  }
});
