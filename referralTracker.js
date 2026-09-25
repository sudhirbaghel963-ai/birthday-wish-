/**
 * Referral Tracking & Redirect Engine for Velvet & Keepsake Influencer Program
 * Redirects visitors arriving via ?ref= directly to signup/login while recording influencer clicks.
 * Attribution is handled strictly at account signup time, never via localStorage.
 */

import { supabase } from './supabaseClient.js';

/**
 * Checks for ?ref= or ?r= in URL.
 * - Increments influencer click counter atomically via Supabase RPC.
 * - If on any page other than /login, redirects directly to /login.html?ref=CODE.
 */
export async function handleReferralRedirect() {
  if (typeof window === 'undefined') return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rawRef = urlParams.get('ref') || urlParams.get('r');

    if (!rawRef) return;

    const normalizedCode = rawRef.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length < 2) return;

    // Track click once per tab session
    const sessionKey = `vk_click_tracked_${normalizedCode}`;
    const alreadyTracked = sessionStorage.getItem(sessionKey);

    if (supabase && !alreadyTracked) {
      try {
        await supabase.rpc('increment_influencer_clicks', {
          p_code: normalizedCode
        });
        sessionStorage.setItem(sessionKey, '1');
      } catch (err) {
        console.warn('[ReferralTracker] Click tracking warning:', err);
      }
    }

    // Check current pathname
    const pathname = window.location.pathname.toLowerCase();
    const isLoginPage = pathname.endsWith('login.html') || pathname.endsWith('/login') || pathname === '/login';

    if (!isLoginPage) {
      // Preserve existing query params other than ref/r if any
      const searchParams = new URLSearchParams();
      searchParams.set('ref', normalizedCode);

      // Carry redirect parameter if user was headed somewhere specific
      const redirect = urlParams.get('redirect');
      if (redirect) searchParams.set('redirect', redirect);

      const target = `./login.html?${searchParams.toString()}`;
      window.location.replace(target);
    }
  } catch (err) {
    console.warn('[ReferralTracker] Error handling referral redirect:', err);
  }
}

/**
 * Backward compatibility alias for handleReferralRedirect
 */
export const captureReferralParam = handleReferralRedirect;
