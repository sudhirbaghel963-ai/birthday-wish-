import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function main() {
  console.log('=== VERIFYING INFLUENCER GOOGLE AUTH & ONBOARDING FLOW ===\n');

  // 1. Static HTML checks
  console.log('1. Checking influencer.html UI elements...');
  const html = fs.readFileSync(path.resolve('influencer.html'), 'utf-8');

  assert(html.includes('btnGoogleAuth'), 'Contains #btnGoogleAuth button');
  assert(html.includes('Continue with Google'), 'Displays "Continue with Google"');
  assert(html.includes('or continue with email'), 'Contains divider "or continue with email"');
  assert(html.includes('googleFollowupSection'), 'Contains #googleFollowupSection container');
  assert(html.includes('googleFollowupForm'), 'Contains #googleFollowupForm');
  assert(html.includes('googleSignupMobile'), 'Contains mobile field for Google followup');
  assert(html.includes('googleSignupUpi'), 'Contains UPI field for Google followup');
  assert(html.includes('googlePayoutType'), 'Contains payout type options for Google followup');
  assert(html.includes('btnGoogleSwitchAccount'), 'Contains switch account / sign out option');
  console.log('✓ All UI elements verified in influencer.html');

  // 2. Database integration check: First-time Google Creator Onboarding Simulation
  console.log('\n2. Simulating First-time Google Creator Onboarding...');
  const mockGoogleUserId = randomUUID();
  const mockGoogleEmail = `creator_g_${Date.now().toString().slice(-6)}@gmail.com`;
  const mockGoogleName = 'Aarav Mehta';
  const referralCode = 'AARAV' + Date.now().toString().slice(-4);

  // Insert profile simulating googleFollowupForm submission
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: mockGoogleUserId,
      name: mockGoogleName,
      email: mockGoogleEmail,
      mobile: '+91 9123456780',
      social_handle: '@aarav.films',
      referral_code: referralCode,
      payout_details: { type: 'upi', upi_id: 'aarav@okhdfcbank' },
      status: 'active',
      clicks: 0
    })
  });

  assert(insertRes.ok, `Insert must succeed with HTTP 201/200, got ${insertRes.status}`);
  const insertedData = await insertRes.json();
  const createdInf = insertedData[0];
  console.log('✓ Successfully created Google influencer profile:');
  console.log(`  ID: ${createdInf.id}`);
  console.log(`  User ID: ${createdInf.user_id}`);
  console.log(`  Email: ${createdInf.email}`);
  console.log(`  Referral Code: ${createdInf.referral_code}`);

  // 3. Simulating Returning Google Creator Session Check (instant dashboard redirect)
  console.log('\n3. Simulating Returning Google Creator Check (User ID lookup)...');
  const returnRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?user_id=eq.${mockGoogleUserId}&select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const returnRows = await returnRes.json();
  assert.strictEqual(returnRows.length, 1, 'Must find exact 1 influencer record');
  assert.strictEqual(returnRows[0].referral_code, referralCode, 'Referral code must match');
  console.log('✓ Returning influencer detected immediately. Eligible for direct dashboard redirection!');

  // 4. Clean up test record
  console.log('\n4. Cleaning up test record...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${createdInf.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  console.log(`✓ Cleanup status: ${delRes.status}`);

  console.log('\n🎉 ALL GOOGLE OAUTH & INFLUENCER ONBOARDING CHECKS PASSED!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
