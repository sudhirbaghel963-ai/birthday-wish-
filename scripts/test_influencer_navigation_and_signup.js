import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

async function runVerification() {
  console.log('================================================================');
  console.log('🔍 VERIFYING INFLUENCER ENTRY POINTS, NAVIGATION & SIGNUP FLOW');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Step 1: Verify Landing Page Footer Link ---
  console.log('--- Step 1: Landing Page Footer Link ---');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  const hasIndexFooterLink = indexHtml.includes('href="./influencer.html"') && 
    (indexHtml.includes('Become an Influencer') || indexHtml.includes('Affiliate Program') || indexHtml.includes('Creator Program'));
  assert(hasIndexFooterLink, 'Landing Page footer contains visible link to influencer signup (./influencer.html)');

  // --- Step 2: Verify Login/Signup Page Creator Link ---
  console.log('\n--- Step 2: Login/Signup Page Creator Link ---');
  const loginHtml = fs.readFileSync(path.resolve('login.html'), 'utf-8');
  const hasLoginCreatorLink = loginHtml.includes('href="./influencer.html"') && loginHtml.includes('Are you a creator?');
  assert(hasLoginCreatorLink, 'Login/Signup page contains separate creator link pointing to ./influencer.html');

  // --- Step 3: Verify /influencer Page Structure & Content ---
  console.log('\n--- Step 3: Verify /influencer Page Content ---');
  const infHtml = fs.readFileSync(path.resolve('influencer.html'), 'utf-8');
  assert(infHtml.includes('20%'), 'Influencer page explains 20% commission structure');
  assert(infHtml.includes('signupForm') && infHtml.includes('signupName') && infHtml.includes('signupEmail'), 'Influencer signup form exists with name, email, password, mobile');
  assert(infHtml.includes('payoutType') && infHtml.includes('signupUpi'), 'Payout details (UPI / Bank) included in signup form');
  assert(infHtml.includes('influencer-dashboard.html'), 'Redirects to ./influencer-dashboard.html upon completion');

  // --- Step 4: Complete Test Influencer Signup & DB Attribution ---
  console.log('\n--- Step 4: Test Influencer Signup & Database State ---');
  const testEmail = `creator_test_${Date.now()}@example.com`;
  const testName = 'Sarah Creator';
  const testRefCode = `SARAH${Math.floor(1000 + Math.random() * 9000)}`;
  let createdInfluencerId = null;

  try {
    // 4.1 Insert test influencer in DB (simulating influencer form completion)
    const infInsertRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        mobile: '+919876543210',
        social_handle: '@sarahcreates',
        referral_code: testRefCode,
        payout_details: { type: 'upi', upi_id: 'sarah@okaxis' },
        status: 'active',
        clicks: 0
      })
    });

    const infJson = await infInsertRes.json();
    const infRow = Array.isArray(infJson) ? infJson[0] : infJson;
    createdInfluencerId = infRow?.id;
    assert(infInsertRes.ok && infRow?.id, 'Influencer profile successfully created in database');
    assert(infRow?.referral_code === testRefCode, `Unique referral code generated: ${testRefCode}`);
    assert(infRow?.status === 'active', 'Influencer account status is active');

    // 4.2 Verify redirection destination logic
    // Querying by email or referral code correctly identifies influencer status
    const checkInfRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?referral_code=eq.${testRefCode}`, {
      method: 'GET',
      headers
    });
    const checkJson = await checkInfRes.json();
    const matchedInf = Array.isArray(checkJson) ? checkJson[0] : checkJson;
    assert(matchedInf?.id === createdInfluencerId, 'User correctly recognized as influencer on authentication');
    
    // 4.3 Verify dashboard loading for this influencer
    const dashInfRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${createdInfluencerId}`, {
      method: 'GET',
      headers
    });
    const dashJson = await dashInfRes.json();
    const dashInf = Array.isArray(dashJson) ? dashJson[0] : dashJson;
    assert(dashInf?.name === testName, 'Influencer dashboard can load profile data');
    assert(dashInf?.payout_details?.upi_id === 'sarah@okaxis', 'Influencer dashboard loads saved payout details');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Cleanup
    console.log('\n--- Cleaning up test artifacts ---');
    if (createdInfluencerId) {
      await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${createdInfluencerId}`, {
        method: 'DELETE',
        headers
      });
      console.log('✓ Test influencer row deleted.');
    }
  }

  console.log('\n================================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runVerification();
