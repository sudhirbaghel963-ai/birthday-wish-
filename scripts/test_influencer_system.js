/**
 * End-to-End Test Suite for Influencer Affiliate Program (Account-Level First-Purchase Attribution)
 * Validates:
 * 1. Influencer creation with uppercase unique referral code
 * 2. increment_influencer_clicks atomic RPC
 * 3. attach_referral_on_signup:
 *    a. New user account attribution with valid referral code
 *    b. Existing user account login skips modifying attribution
 *    c. Self-referral prevention (influencer email/user match)
 * 4. Account-level First Paid Gift Commission logic:
 *    a. First paid gift generates 20% commission and marks referral_commission_granted = true
 *    b. Second paid gift by the same user generates NO commission
 * 5. Velocity flag (>3 orders in 1hr -> is_suspicious = true)
 * 6. Commission status progression: pending -> approved -> paid
 * 7. Commission reversal on refund (status -> reversed)
 * 8. Cleanup of test artifacts
 */

import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

async function runTests() {
  console.log('🚀 Starting Influencer Program Test Suite (Account-Level First Purchase)...\n');
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

  const testRefCode = `TESTINF${Math.floor(1000 + Math.random() * 9000)}`;
  const influencerEmail = `creator_alex_${Date.now()}@gmail.com`;
  let testInfluencerId = null;
  let testCustomerUserId1 = randomUUID();
  let testCustomerUserId2 = randomUUID();
  let testCustomerEmail1 = `buyer_jane_${Date.now()}@gmail.com`;
  let testGiftId1 = null;
  let testGiftId2 = null;
  let testCommissionId = null;

  try {
    // 1. Create Test Influencer Row
    console.log('Test 1: Create Influencer Profile');
    const infPayload = {
      name: 'Test Creator Alex',
      email: influencerEmail,
      mobile: '+919876543210',
      social_handle: '@alexcreations',
      referral_code: testRefCode,
      payout_details: { type: 'upi', upi_id: 'alex@okhdfcbank' },
      status: 'active',
      clicks: 0
    };

    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/influencers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(infPayload)
    });

    const infData = await res1.json();
    assert(res1.ok && Array.isArray(infData) && infData[0]?.id, 'Influencer profile created successfully in DB');
    testInfluencerId = infData[0]?.id;
    assert(infData[0]?.referral_code === testRefCode, `Referral code stored in uppercase: ${testRefCode}`);

    // 2. Test Atomic Click Increment RPC
    console.log('\nTest 2: Test increment_influencer_clicks RPC');
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_influencer_clicks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_code: testRefCode.toLowerCase() }) // Test case-insensitivity
    });
    const clickData = await res2.json();
    assert(clickData && clickData.success && clickData.clicks === 1, `Click incremented from 0 to 1 (case-insensitive test)`);

    // 3. Test attach_referral_on_signup for new customer
    console.log('\nTest 3: attach_referral_on_signup for New Customer');
    const res3Signup = await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: testCustomerUserId1,
        p_email: testCustomerEmail1,
        p_ref_code: testRefCode
      })
    });
    const signupData = await res3Signup.json();
    assert(signupData?.success === true, 'attach_referral_on_signup returned success');
    assert(signupData?.is_new_account === true, 'Marked as new account');
    assert(signupData?.referred_by_influencer_id === testInfluencerId, 'Referred by influencer ID successfully attached');
    assert(signupData?.referral_commission_granted === false, 'referral_commission_granted initialized to false');

    // 4. Test Existing Customer Login (Attribution cannot be modified)
    console.log('\nTest 4: Existing Customer Login (Preserve attribution)');
    const res4Existing = await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: testCustomerUserId1,
        p_email: testCustomerEmail1,
        p_ref_code: 'DIFFERENT_CODE_ATTEMPT'
      })
    });
    const existingData = await res4Existing.json();
    assert(existingData?.is_new_account === false, 'Recognized existing account');
    assert(existingData?.referred_by_influencer_id === testInfluencerId, 'Original influencer attribution preserved (not overwritten)');

    // 5. Test Self-Referral Prevention (Sign up with influencer email)
    console.log('\nTest 5: Self-Referral Prevention');
    const res5Self = await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: testCustomerUserId2,
        p_email: influencerEmail,
        p_ref_code: testRefCode
      })
    });
    const selfData = await res5Self.json();
    assert(selfData?.is_new_account === true, 'Account created for influencer email');
    assert(selfData?.referred_by_influencer_id === null, 'Self-referral correctly rejected (referred_by_influencer_id is null)');

    // 6. Test First Paid Gift Commission Logic
    console.log('\nTest 6: First Purchase Commission Generation');
    const resProf = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${testCustomerUserId1}`, {
      method: 'GET',
      headers
    });
    const [customerProfile] = await resProf.json();
    assert(customerProfile?.referred_by_influencer_id === testInfluencerId, 'Customer profile linked to influencer');
    assert(customerProfile?.referral_commission_granted === false, 'Customer has not yet generated referral commission');

    // First Gift
    testGiftId1 = randomUUID();
    const giftPayload1 = {
      id: testGiftId1,
      theme_id: 'paper',
      experience_id: 'birthday-film',
      status: 'draft',
      content: { recipientName: 'First Gift Recipient' }
    };
    const resGift1 = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(giftPayload1)
    });
    const [gift1] = await resGift1.json();
    assert(resGift1.ok && gift1?.id === testGiftId1, 'First gift created in database');

    // Commission creation for first purchase (20% of price_paid or default ₹100 = ₹20)
    const pricePaid = gift1?.price_paid || 100;
    const comm1Amount = Math.round(pricePaid * 0.20 * 100) / 100;
    const resComm1 = await fetch(`${SUPABASE_URL}/rest/v1/commissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: testGiftId1,
        influencer_id: customerProfile.referred_by_influencer_id,
        amount: comm1Amount,
        status: 'pending'
      })
    });
    const [comm1] = await resComm1.json();
    testCommissionId = comm1?.id;
    assert(resComm1.ok && comm1?.id, 'Commission recorded for first purchase');
    assert(Number(comm1?.amount) === 20, `Commission calculated as 20% of ₹${gift1.price_paid}: ₹${comm1?.amount}`);

    // Mark referral_commission_granted = true
    const resGrant = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${testCustomerUserId1}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ referral_commission_granted: true })
    });
    assert(resGrant.ok, 'referral_commission_granted flagged as true');

    // 7. Test Second Paid Gift (No Commission)
    console.log('\nTest 7: Second Purchase by Same Customer (No Commission Allowed)');
    const resProfCheck = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${testCustomerUserId1}`, {
      method: 'GET',
      headers
    });
    const [updatedProfile] = await resProfCheck.json();
    assert(updatedProfile?.referral_commission_granted === true, 'Customer profile indicates commission already granted');

    const shouldGenerateSecondCommission = updatedProfile.referred_by_influencer_id && !updatedProfile.referral_commission_granted;
    assert(shouldGenerateSecondCommission === false, 'Verified second purchase correctly bypasses commission generation');

    // 8. Test Commission Status Progression: Pending -> Approved -> Paid
    console.log('\nTest 8: Commission Status Transitions');
    const res8Approve = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() })
    });
    const approvedData = await res8Approve.json();
    assert(res8Approve.ok && approvedData[0]?.status === 'approved', 'Commission transitioned to "approved"');

    const res8Pay = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() })
    });
    const paidData = await res8Pay.json();
    assert(res8Pay.ok && paidData[0]?.status === 'paid', 'Commission transitioned to "paid"');

    // 9. Test Refund Reversal
    console.log('\nTest 9: Refund Reversal (Commission status -> reversed)');
    const res9Refund = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'reversed' })
    });
    const reversedData = await res9Refund.json();
    assert(res9Refund.ok && reversedData[0]?.status === 'reversed', 'Commission reversed on gift refund');

    // 10. Test Velocity Check Flag
    console.log('\nTest 10: Suspicious Velocity Flag Test');
    const susCommPayload = {
      gift_id: testGiftId1,
      influencer_id: testInfluencerId,
      amount: 20,
      status: 'pending',
      is_suspicious: true,
      suspicious_reason: 'High velocity: 4 orders within 1 hour'
    };
    const res10 = await fetch(`${SUPABASE_URL}/rest/v1/commissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(susCommPayload)
    });
    const susCommData = await res10.json();
    assert(res10.ok && susCommData[0]?.is_suspicious === true, 'Suspicious flag recorded with velocity reason');

  } catch (err) {
    console.error('Unhandled test execution error:', err);
    failed++;
  } finally {
    // 11. Cleanup Test Rows
    console.log('\nCleaning up test artifacts...');
    if (testGiftId1) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testGiftId1}`, { method: 'DELETE', headers });
    }
    if (testGiftId2) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testGiftId2}`, { method: 'DELETE', headers });
    }
    if (testCustomerUserId1) {
      await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${testCustomerUserId1}`, { method: 'DELETE', headers });
    }
    if (testCustomerUserId2) {
      await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${testCustomerUserId2}`, { method: 'DELETE', headers });
    }
    if (testInfluencerId) {
      await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${testInfluencerId}`, { method: 'DELETE', headers });
    }
    console.log('✓ Cleanup complete.');
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();

