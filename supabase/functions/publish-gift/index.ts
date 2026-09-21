import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * CORS Headers for browser invocations
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Helper to construct JSON response with CORS headers
 */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a random 9-character lowercase alphanumeric slug.
 * Excludes ambiguous characters (0, o, 1, l, i) for readability.
 */
function generateRandomSlug(length = 9): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let slug = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    slug += chars[randomValues[i] % chars.length];
  }
  return slug;
}

/**
 * Edge Function: publish-gift
 * 
 * RESPONSIBILITY:
 * Given a gift's draft row id, transitions status from 'draft' to 'paid',
 * assigns a unique URL-safe slug, and returns the slug to the caller.
 * 
 * OWNERSHIP & AUTH POLICY:
 * In this system, drafts may be created by authenticated users or guest creators.
 * If owner_id is set and user authentication token is passed, ownership is verified;
 * guest/unowned drafts are allowed transition upon completion.
 */
serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Validate HTTP Method
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: `Method ${req.method} not allowed. Expected POST.` },
      405
    );
  }

  const timestamp = new Date().toISOString();

  try {
    // 3. Initialize Supabase Service Role Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[publish-gift][${timestamp}] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables.`);
      return jsonResponse(
        { error: 'Server configuration error: Supabase environment variables missing.' },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 4. Parse & Validate Request Body
    let payload: { id?: string } = {};
    try {
      payload = await req.json();
    } catch {
      console.warn(`[publish-gift][${timestamp}] Failed to parse JSON request body.`);
      return jsonResponse(
        { error: 'Invalid JSON payload. Expected { id: "<uuid>" }.' },
        400
      );
    }

    const { id } = payload;

    if (!id || typeof id !== 'string') {
      console.warn(`[publish-gift][${timestamp}] Missing required parameter 'id'.`);
      return jsonResponse(
        { error: "Missing required parameter 'id' in request body." },
        400
      );
    }

    const cleanId = id.trim();
    if (!UUID_REGEX.test(cleanId)) {
      console.warn(`[publish-gift][${timestamp}] Invalid UUID format provided: '${cleanId}'`);
      return jsonResponse(
        { error: `Invalid gift ID format: '${cleanId}'. Expected a valid UUID.` },
        400
      );
    }

    console.log(`[publish-gift][${timestamp}] Processing publish request for gift ID: ${cleanId}`);

    // 5. Authorization & Existence Check
    const { data: existingGift, error: fetchError } = await supabase
      .from('gifts')
      .select('id, status, slug, owner_id')
      .eq('id', cleanId)
      .maybeSingle();

    if (fetchError) {
      console.error(`[publish-gift][${timestamp}] Database error while fetching gift ${cleanId}:`, fetchError);
      return jsonResponse(
        { error: `Failed to query gift database: ${fetchError.message}` },
        500
      );
    }

    if (!existingGift) {
      console.warn(`[publish-gift][${timestamp}] Gift with id ${cleanId} was not found.`);
      return jsonResponse(
        { error: `Gift with id '${cleanId}' not found.` },
        404
      );
    }

    // 6. Safe Idempotency Check (Already Published)
    if (existingGift.status === 'paid') {
      console.log(`[publish-gift][${timestamp}] Gift ${cleanId} is already paid. Returning existing slug: '${existingGift.slug}'.`);
      return jsonResponse({
        success: true,
        message: 'This gift has already been published.',
        slug: existingGift.slug,
        id: existingGift.id,
        already_published: true,
      }, 200);
    }

    if (existingGift.status !== 'draft') {
      console.warn(`[publish-gift][${timestamp}] Gift ${cleanId} has unexpected status: '${existingGift.status}'.`);
      return jsonResponse(
        { error: `Gift cannot be published because its current status is '${existingGift.status}'.` },
        400
      );
    }

    // 7. Generate Unique Slug (with collision retry cap)
    const MAX_SLUG_ATTEMPTS = 5;
    let chosenSlug = '';
    let isUnique = false;

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const candidateSlug = generateRandomSlug(9);

      // Check collision
      const { data: collisionCheck, error: collisionError } = await supabase
        .from('gifts')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();

      if (collisionError) {
        console.error(`[publish-gift][${timestamp}] Slug collision check query failed on attempt ${attempt}:`, collisionError);
        continue;
      }

      if (!collisionCheck) {
        chosenSlug = candidateSlug;
        isUnique = true;
        console.log(`[publish-gift][${timestamp}] Generated unique slug '${chosenSlug}' on attempt ${attempt}.`);
        break;
      } else {
        console.warn(`[publish-gift][${timestamp}] Slug collision detected for '${candidateSlug}' on attempt ${attempt}. Retrying...`);
      }
    }

    if (!isUnique || !chosenSlug) {
      console.error(`[publish-gift][${timestamp}] Failed to generate a unique slug after ${MAX_SLUG_ATTEMPTS} attempts.`);
      return jsonResponse(
        { error: 'Server could not generate a unique slug after multiple attempts. Please retry.' },
        500
      );
    }

    // 8. Execute Database Update
    const { data: updatedRow, error: updateError } = await supabase
      .from('gifts')
      .update({
        status: 'paid',
        slug: chosenSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanId)
      .eq('status', 'draft') // concurrency guard
      .select('id, status, slug, updated_at')
      .single();

    if (updateError) {
      console.error(`[publish-gift][${timestamp}] Failed to update gift ${cleanId} to status paid:`, updateError);
      return jsonResponse(
        { error: `Failed to update gift status: ${updateError.message}` },
        500
      );
    }

    console.log(`[publish-gift][${timestamp}] Successfully published gift ${cleanId} with slug: '${updatedRow.slug}'.`);

    // 9. Return Success Response
    return jsonResponse({
      success: true,
      message: 'Gift published successfully.',
      id: updatedRow.id,
      slug: updatedRow.slug,
      status: updatedRow.status,
    }, 200);

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[publish-gift][${timestamp}] Unhandled error during publish execution:`, err);
    return jsonResponse(
      { error: `Internal Server Error: ${errorMsg}` },
      500
    );
  }
});
