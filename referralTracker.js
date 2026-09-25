/**
 * Referral Tracking Utility for Velvet & Keepsake Influencer Affiliate Program
 * Handles 30-day cookie/localStorage attribution and atomic click recording via Supabase RPC.
 */

import { supabase } from './supabaseClient.js';

const REFERRAL_KEY_CODE = 'vk_referral_code';
const REFERRAL_KEY_ID = 'vk_referral_influencer_id';
const REFERRAL_KEY_TIMESTAMP = 'vk_referral_timestamp';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

/**
 * Normalizes and checks for ?ref= or ?r= in current URL, tracks click, and persists attribution.
 */
export async function captureReferralParam() {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rawRef = urlParams.get('ref') || urlParams.get('r');

    if (!rawRef) return getAttributedInfluencer();

    const normalizedCode = rawRef.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length < 2) return getAttributedInfluencer();

    // Prevent double counting click in the same browser tab session for the same code
    const sessionKey = `vk_ref_session_${normalizedCode}`;
    const alreadyCountedInSession = sessionStorage.getItem(sessionKey);

    if (supabase) {
      if (!alreadyCountedInSession) {
        try {
          const { data, error } = await supabase.rpc('increment_influencer_clicks', {
            p_code: normalizedCode
          });

          if (!error && data && data.success) {
            sessionStorage.setItem(sessionKey, '1');
            localStorage.setItem(REFERRAL_KEY_CODE, normalizedCode);
            localStorage.setItem(REFERRAL_KEY_ID, data.id);
            localStorage.setItem(REFERRAL_KEY_TIMESTAMP, Date.now().toString());

            return {
              id: data.id,
              code: normalizedCode
            };
          } else {
            console.warn('[ReferralTracker] Click increment returned:', data?.error || error?.message);
          }
        } catch (rpcErr) {
          console.warn('[ReferralTracker] RPC call failed:', rpcErr);
        }
      } else {
        // Already recorded click this session, ensure localStorage is fresh
        const storedId = localStorage.getItem(REFERRAL_KEY_ID);
        if (storedId) {
          return { id: storedId, code: normalizedCode };
        }
      }
    }
  } catch (err) {
    console.warn('[ReferralTracker] Error capturing referral param:', err);
  }

  return getAttributedInfluencer();
}

/**
 * Returns the currently active attributed influencer ID if within 30-day window.
 */
export function getAttributedInfluencer() {
  if (typeof window === 'undefined') return null;

  try {
    const code = localStorage.getItem(REFERRAL_KEY_CODE);
    const id = localStorage.getItem(REFERRAL_KEY_ID);
    const timestampStr = localStorage.getItem(REFERRAL_KEY_TIMESTAMP);

    if (!id || !timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || (Date.now() - timestamp > ATTRIBUTION_WINDOW_MS)) {
      // Attribution expired
      clearReferralAttribution();
      return null;
    }

    return { id, code };
  } catch (e) {
    console.warn('[ReferralTracker] Error reading attribution:', e);
    return null;
  }
}

/**
 * Returns only the attributed influencer ID if valid.
 */
export function getAttributedInfluencerId() {
  const ref = getAttributedInfluencer();
  return ref ? ref.id : null;
}

/**
 * Clears stored referral attribution.
 */
export function clearReferralAttribution() {
  try {
    localStorage.removeItem(REFERRAL_KEY_CODE);
    localStorage.removeItem(REFERRAL_KEY_ID);
    localStorage.removeItem(REFERRAL_KEY_TIMESTAMP);
  } catch (_) {}
}
