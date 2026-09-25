/**
 * Comprehensive Integration Test Suite for:
 * 1. Automatic 10% Referral Discount for First-Purchase Referred Customers
 * 2. Interaction with Manual Coupon Codes (Non-Stacking / Largest Discount Wins)
 * 3. Server-Side Price Calculation & discount_source Persistence
 * 4. Commission Calculation on ORIGINAL (Undiscounted) Base Price (20% of Base)
 * 5. Second-Purchase Normal Pricing (No Discount & No Commission)
 */

import { randomUUID, createHmac } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';
const RAZORPAY_KEY_SECRET = 'IZp2gVHrukHNeHaMLb5FKVZP'; // Live Razorpay Key Secret configured in Supabase

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

function computeHmacSha256(data, key) {
  return createHmac('sha256', key).update(data).digest('hex');
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING REFERRAL DISCOUNT & COMMISSION INTEGRATION TEST SUITE');
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

  const testRefCode = `TESTINF${Math.floor(1000 + Math.random() * 9000)}`;
  const testCouponCode20 = `SAVE20_${Math.floor(1000 + Math.random() * 9000)}`;
  const testCouponCode5 = `SAVE5_${Math.floor(1000 + Math.random() * 9000)}`;

  let testInfluencerId = null;
  let customerUser1 = randomUUID();
  let customerUser2 = randomUUID();
  let customerUser3 = randomUUID();
  let customerUserNonRef = randomUUID();

  const createdGiftIds = [];
  const createdCouponIds = [];

  try {
    // -------------------------------------------------------------
    // Step 0: Setup Test Influencer and Coupons
    // -------------------------------------------------------------
    console.log('--- Step 0: Setting Up Influencer & Test Coupons ---');

    // 0.1 Influencer
    const infRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Affiliate Maya',
        email: `maya_${Date.now()}@gmail.com`,
        mobile: '+919988776655',
        social_handle: '@mayacreates',
        referral_code: testRefCode,
        status: 'active',
        clicks: 0
      })
    });
    const [infData] = await infRes.json();
    testInfluencerId = infData?.id;
    assert(infRes.ok && testInfluencerId, `Test Influencer created with code: ${testRefCode}`);

    // 0.2 Coupon 20%
    const c20Res = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: testCouponCode20,
        discount_percent: 20,
        is_active: true
      })
    });
    const [c20Data] = await c20Res.json();
    createdCouponIds.push(c20Data?.id);
    assert(c20Res.ok && c20Data?.id, `20% Coupon created: ${testCouponCode20}`);

    // 0.3 Coupon 5%
    const c5Res = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: testCouponCode5,
        discount_percent: 5,
        is_active: true
      })
    });
    const [c5Data] = await c5Res.json();
    createdCouponIds.push(c5Data?.id);
    assert(c5Res.ok && c5Data?.id, `5% Coupon created: ${testCouponCode5}`);

    // -------------------------------------------------------------
    // Scenario 1: Referred First-Time Customer (Automatic 10% Discount, No Coupon)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Referred First-Time Customer (Automatic 10% Discount, No Coupon) ---');

    // Sign up customer 1 with referral code
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: customerUser1,
        p_email: `customer1_${Date.now()}@gmail.com`,
        p_ref_code: testRefCode
      })
    });

    const giftId1 = randomUUID();
    createdGiftIds.push(giftId1);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId1,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Elena' }
      })
    });

    // Call create-razorpay-order without coupon code
    const orderRes1 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId1, customer_id: customerUser1 })
    });
    const orderData1 = await orderRes1.json();

    assert(orderData1.success === true, 'create-razorpay-order succeeded');
    assert(orderData1.base_price_inr === 100, `Base price detected as ₹100`);
    assert(orderData1.discount_percent === 10, 'Automatic 10% referral discount applied');
    assert(orderData1.discount_source === 'referral', "discount_source recorded as 'referral'");
    assert(orderData1.amount_inr === 90, 'Charged amount is ₹90 (10% off ₹100)');
    assert(orderData1.amount === 9000, 'Charged amount in paise is 9000');

    // Verify payment for gift 1
    const orderId1 = orderData1.order_id;
    const paymentId1 = `pay_${randomUUID().substring(0, 14)}`;
    const sig1 = computeHmacSha256(`${orderId1}|${paymentId1}`, RAZORPAY_KEY_SECRET);

    const verifyRes1 = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: giftId1,
        customer_id: customerUser1,
        razorpay_order_id: orderId1,
        razorpay_payment_id: paymentId1,
        razorpay_signature: sig1
      })
    });
    const verifyData1 = await verifyRes1.json();
    assert(verifyData1.success === true, 'Payment verification succeeded');
    assert(verifyData1.price_paid === 90, 'Gift row price_paid saved as ₹90');

    // Check commission row: 20% of ORIGINAL ₹100 = ₹20 (NOT 20% of ₹90 = ₹18)
    const commRes1 = await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${giftId1}`, {
      method: 'GET',
      headers
    });
    const [comm1] = await commRes1.json();
    assert(comm1?.influencer_id === testInfluencerId, 'Commission attached to correct influencer');
    assert(Number(comm1?.amount) === 20, `Commission is exactly ₹20 (20% of original ₹100 base price, not 20% of ₹90): ₹${comm1?.amount}`);

    // Verify referral_commission_granted flipped to true
    const profRes1 = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${customerUser1}`, { method: 'GET', headers });
    const [prof1] = await profRes1.json();
    assert(prof1?.referral_commission_granted === true, 'Customer referral_commission_granted is now true');

    // -------------------------------------------------------------
    // Scenario 2: Referred First-Time Customer + 20% Coupon (Coupon Wins, No Stacking)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Referred First-Time Customer + 20% Coupon (Coupon Wins, No Stacking) ---');

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: customerUser2,
        p_email: `customer2_${Date.now()}@gmail.com`,
        p_ref_code: testRefCode
      })
    });

    const giftId2 = randomUUID();
    createdGiftIds.push(giftId2);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId2,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Elena' }
      })
    });

    // Call create-razorpay-order with SAVE20 coupon
    const orderRes2 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId2, customer_id: customerUser2, coupon_code: testCouponCode20 })
    });
    const orderData2 = await orderRes2.json();

    assert(orderData2.success === true, 'create-razorpay-order with coupon succeeded');
    assert(orderData2.discount_percent === 20, '20% coupon applied (not stacked to 30%)');
    assert(orderData2.discount_source === 'coupon', "discount_source recorded as 'coupon'");
    assert(orderData2.coupon_code === testCouponCode20, `coupon_code recorded as ${testCouponCode20}`);
    assert(orderData2.amount_inr === 80, 'Charged amount is ₹80 (20% off ₹100)');

    // Verify payment for gift 2
    const orderId2 = orderData2.order_id;
    const paymentId2 = `pay_${randomUUID().substring(0, 14)}`;
    const sig2 = computeHmacSha256(`${orderId2}|${paymentId2}`, RAZORPAY_KEY_SECRET);

    const verifyRes2 = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: giftId2,
        customer_id: customerUser2,
        razorpay_order_id: orderId2,
        razorpay_payment_id: paymentId2,
        razorpay_signature: sig2
      })
    });
    const verifyData2 = await verifyRes2.json();
    assert(verifyData2.price_paid === 80, 'Gift row price_paid saved as ₹80');

    // Commission should STILL be 20% of ORIGINAL ₹100 = ₹20 (NOT 20% of ₹80 = ₹16)
    const commRes2 = await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${giftId2}`, { method: 'GET', headers });
    const [comm2] = await commRes2.json();
    assert(Number(comm2?.amount) === 20, `Commission protected at ₹20 (20% of original ₹100 base price despite 20% coupon discount): ₹${comm2?.amount}`);

    // -------------------------------------------------------------
    // Scenario 3: Referred First-Time Customer + 5% Coupon (10% Referral Wins)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Referred First-Time Customer + 5% Coupon (10% Referral Wins) ---');

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: customerUser3,
        p_email: `customer3_${Date.now()}@gmail.com`,
        p_ref_code: testRefCode
      })
    });

    const giftId3 = randomUUID();
    createdGiftIds.push(giftId3);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId3,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Elena' }
      })
    });

    // Call create-razorpay-order with 5% coupon
    const orderRes3 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId3, customer_id: customerUser3, coupon_code: testCouponCode5 })
    });
    const orderData3 = await orderRes3.json();

    assert(orderData3.success === true, 'create-razorpay-order succeeded');
    assert(orderData3.discount_percent === 10, '10% referral discount applied because 10% > 5%');
    assert(orderData3.discount_source === 'referral', "discount_source recorded as 'referral'");
    assert(orderData3.amount_inr === 90, 'Charged amount is ₹90 (10% off)');

    // Verify payment for gift 3
    const orderId3 = orderData3.order_id;
    const paymentId3 = `pay_${randomUUID().substring(0, 14)}`;
    const sig3 = computeHmacSha256(`${orderId3}|${paymentId3}`, RAZORPAY_KEY_SECRET);

    await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: giftId3,
        customer_id: customerUser3,
        razorpay_order_id: orderId3,
        razorpay_payment_id: paymentId3,
        razorpay_signature: sig3
      })
    });

    const commRes3 = await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${giftId3}`, { method: 'GET', headers });
    const [comm3] = await commRes3.json();
    assert(Number(comm3?.amount) === 20, `Commission calculated as ₹20 (20% of original ₹100): ₹${comm3?.amount}`);

    // -------------------------------------------------------------
    // Scenario 4: Second Purchase by Existing Customer 1 (No Discount & No Commission)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Second Purchase by Existing Customer 1 (No Discount & No Commission) ---');

    const giftId4 = randomUUID();
    createdGiftIds.push(giftId4);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId4,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Elena Second Gift' }
      })
    });

    const orderRes4 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId4, customer_id: customerUser1 })
    });
    const orderData4 = await orderRes4.json();

    assert(orderData4.amount_inr === 100, 'Second purchase charged at full base price ₹100 (no automatic referral discount)');
    assert(orderData4.discount_percent === null, 'discount_percent is null');
    assert(orderData4.discount_source === null, 'discount_source is null');

    const orderId4 = orderData4.order_id;
    const paymentId4 = `pay_${randomUUID().substring(0, 14)}`;
    const sig4 = computeHmacSha256(`${orderId4}|${paymentId4}`, RAZORPAY_KEY_SECRET);

    await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: giftId4,
        customer_id: customerUser1,
        razorpay_order_id: orderId4,
        razorpay_payment_id: paymentId4,
        razorpay_signature: sig4
      })
    });

    const commRes4 = await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${giftId4}`, { method: 'GET', headers });
    const comms4 = await commRes4.json();
    assert(Array.isArray(comms4) && comms4.length === 0, 'Verified ZERO commission generated on second purchase');

    // -------------------------------------------------------------
    // Scenario 5: Non-Referred Customer (Standard Flow)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Non-Referred Customer (Standard Flow) ---');

    await fetch(`${SUPABASE_URL}/rest/v1/rpc/attach_referral_on_signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_user_id: customerUserNonRef,
        p_email: `nonref_${Date.now()}@gmail.com`,
        p_ref_code: null
      })
    });

    const giftId5 = randomUUID();
    createdGiftIds.push(giftId5);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId5,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Elena Non-Ref' }
      })
    });

    // 5.1 No coupon -> Full Price ₹100
    const orderRes5a = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId5, customer_id: customerUserNonRef })
    });
    const orderData5a = await orderRes5a.json();
    assert(orderData5a.amount_inr === 100, 'Non-referred customer charged regular ₹100 without coupon');
    assert(orderData5a.discount_source === null, 'No discount source');

    // 5.2 With SAVE20 coupon -> Discounted ₹80
    const orderRes5b = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId5, customer_id: customerUserNonRef, coupon_code: testCouponCode20 })
    });
    const orderData5b = await orderRes5b.json();
    assert(orderData5b.amount_inr === 80, 'Non-referred customer charged ₹80 with 20% coupon');
    assert(orderData5b.discount_source === 'coupon', "discount_source is 'coupon'");

    const orderId5 = orderData5b.order_id;
    const paymentId5 = `pay_${randomUUID().substring(0, 14)}`;
    const sig5 = computeHmacSha256(`${orderId5}|${paymentId5}`, RAZORPAY_KEY_SECRET);

    await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gift_id: giftId5,
        customer_id: customerUserNonRef,
        razorpay_order_id: orderId5,
        razorpay_payment_id: paymentId5,
        razorpay_signature: sig5
      })
    });

    const commRes5 = await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${giftId5}`, { method: 'GET', headers });
    const comms5 = await commRes5.json();
    assert(Array.isArray(comms5) && comms5.length === 0, 'No commission created for non-referred customer purchase');

  } catch (err) {
    console.error('Unhandled test execution error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // Step 6: Cleanup Test Data
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test artifacts ---');
    for (const gid of createdGiftIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/commissions?gift_id=eq.${gid}`, { method: 'DELETE', headers });
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${gid}`, { method: 'DELETE', headers });
    }
    for (const cid of createdCouponIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=eq.${cid}`, { method: 'DELETE', headers });
    }
    for (const uid of [customerUser1, customerUser2, customerUser3, customerUserNonRef]) {
      await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?id=eq.${uid}`, { method: 'DELETE', headers });
    }
    if (testInfluencerId) {
      await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${testInfluencerId}`, { method: 'DELETE', headers });
    }
    console.log('✓ Cleanup completed.');
  }

  console.log(`\n================================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
