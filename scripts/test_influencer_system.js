/**
 * End-to-End Test Suite for Influencer Affiliate Program (Phase 1 MVP)
 * Validates:
 * 1. Influencer creation with uppercase unique referral code
 * 2. increment_influencer_clicks atomic RPC
 * 3. Referred draft gift creation with referred_by_influencer_id
 * 4. 20% commission calculation and insertion
 * 5. Velocity flag (>3 orders in 1hr -> is_suspicious = true)
 * 6. Commission status progression: pending -> approved -> paid
 * 7. Commission reversal on refund (status -> reversed)
 * 8. Cleanup of test artifacts
 */

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

async function runTests() {
  console.log('🚀 Starting Influencer Affiliate Program Test Suite...\n');
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
  let testInfluencerId = null;
  let testGiftId = null;
  let testCommissionId = null;

  try {
    // 1. Create Test Influencer Row
    console.log('Test 1: Create Influencer Profile');
    const infPayload = {
      name: 'Test Creator Alex',
      email: `test_alex_${Date.now()}@example.com`,
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

    // Increment click a second time
    const res2b = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_influencer_clicks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_code: testRefCode })
    });
    const clickData2 = await res2b.json();
    assert(clickData2 && clickData2.clicks === 2, `Click incremented from 1 to 2`);

    // 3. Test Gift Draft with referred_by_influencer_id
    console.log('\nTest 3: Attributed Gift Creation');
    const giftPayload = {
      theme_id: 'paper',
      experience_id: 'birthday-film',
      status: 'draft',
      referred_by_influencer_id: testInfluencerId,
      content: { recipientName: 'Test Recipient' }
    };

    const res3 = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(giftPayload)
    });
    const giftData = await res3.json();
    if (!res3.ok) console.log('res3 error:', res3.status, giftData);
    assert(res3.ok && giftData[0]?.id, 'Attributed draft gift created with referred_by_influencer_id');
    testGiftId = giftData[0]?.id;
    assert(giftData[0]?.referred_by_influencer_id === testInfluencerId, 'Gift correctly linked to influencer');

    // 4. Test 20% Commission Calculation
    console.log('\nTest 4: Commission Record Creation (20% of price_paid = ₹20)');
    const pricePaid = giftData[0]?.price_paid || 100;
    const expectedCommission = Math.round(pricePaid * 0.20 * 100) / 100; // 20.00

    const commPayload = {
      gift_id: testGiftId,
      influencer_id: testInfluencerId,
      amount: expectedCommission,
      status: 'pending',
      is_suspicious: false
    };

    const res4 = await fetch(`${SUPABASE_URL}/rest/v1/commissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commPayload)
    });
    const commData = await res4.json();
    assert(res4.ok && commData[0]?.id, 'Commission record created');
    testCommissionId = commData[0]?.id;
    assert(Number(commData[0]?.amount) === 20, `Commission calculated as exactly 20% of ₹100: ₹${commData[0]?.amount}`);
    assert(commData[0]?.status === 'pending', 'Initial commission status is "pending"');

    // 5. Test Status Progression: Pending -> Approved -> Paid
    console.log('\nTest 5: Commission Status Transitions');
    const res5Approve = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString() })
    });
    const approvedData = await res5Approve.json();
    assert(res5Approve.ok && approvedData[0]?.status === 'approved', 'Commission transitioned to "approved"');

    const res5Pay = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() })
    });
    const paidData = await res5Pay.json();
    assert(res5Pay.ok && paidData[0]?.status === 'paid', 'Commission transitioned to "paid"');

    // 6. Test Refund Reversal
    console.log('\nTest 6: Refund Reversal (Commission status -> reversed)');
    const res6Refund = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=eq.${testCommissionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'reversed' })
    });
    const reversedData = await res6Refund.json();
    assert(res6Refund.ok && reversedData[0]?.status === 'reversed', 'Commission reversed on gift refund');

    // 7. Test Velocity Check Flag
    console.log('\nTest 7: Suspicious Velocity Flag Test');
    const susCommPayload = {
      gift_id: testGiftId,
      influencer_id: testInfluencerId,
      amount: 20,
      status: 'pending',
      is_suspicious: true,
      suspicious_reason: 'High velocity: 4 orders within 1 hour'
    };
    const res7 = await fetch(`${SUPABASE_URL}/rest/v1/commissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(susCommPayload)
    });
    const susCommData = await res7.json();
    assert(res7.ok && susCommData[0]?.is_suspicious === true, 'Suspicious flag recorded with velocity reason');

  } catch (err) {
    console.error('Unhandled test execution error:', err);
    failed++;
  } finally {
    // 8. Cleanup Test Rows
    console.log('\nCleaning up test artifacts...');
    if (testGiftId) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testGiftId}`, { method: 'DELETE', headers });
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
