import crypto from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function computeHmacSha256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

async function run() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE COUPON & DISCOUNT SYSTEM INTEGRATION TEST');
  console.log('================================================================\n');

  const createdCouponIds = [];
  const createdGiftIds = [];

  try {
    // -------------------------------------------------------------
    // Step 1: Create Test Coupons in Database
    // -------------------------------------------------------------
    console.log('--- Step 1: Creating Test Coupons in Database ---');

    // 1. TEST20 (20% off, max 2 uses)
    await fetch(`${SUPABASE_URL}/rest/v1/coupons?code=eq.TEST20`, { method: 'DELETE', headers });
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'TEST20',
        discount_percent: 20,
        max_uses: 2,
        times_used: 0,
        is_active: true
      })
    });
    const c1 = (await res1.json())[0];
    createdCouponIds.push(c1.id);
    console.log('✓ Created TEST20 (20% off, max 2 uses, 0 used):', c1.id);

    // 2. TESTEXPIRED (50% off, expired yesterday)
    await fetch(`${SUPABASE_URL}/rest/v1/coupons?code=eq.TESTEXPIRED`, { method: 'DELETE', headers });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'TESTEXPIRED',
        discount_percent: 50,
        expires_at: yesterday,
        is_active: true
      })
    });
    const c2 = (await res2.json())[0];
    createdCouponIds.push(c2.id);
    console.log('✓ Created TESTEXPIRED (50% off, expired):', c2.id);

    // 3. TESTINACTIVE (30% off, is_active: false)
    await fetch(`${SUPABASE_URL}/rest/v1/coupons?code=eq.TESTINACTIVE`, { method: 'DELETE', headers });
    const res3 = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'TESTINACTIVE',
        discount_percent: 30,
        is_active: false
      })
    });
    const c3 = (await res3.json())[0];
    createdCouponIds.push(c3.id);
    console.log('✓ Created TESTINACTIVE (30% off, deactivated):', c3.id);

    // -------------------------------------------------------------
    // Step 2: Test validate-coupon Edge Function
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Testing validate-coupon Edge Function ---');

    // 2.1 Valid coupon (case-insensitive test)
    const valRes1 = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'test20' })
    });
    const valData1 = await valRes1.json();
    console.log('validate-coupon (test20):', valData1);
    if (!valData1.valid || valData1.discount_percent !== 20 || valData1.code !== 'TEST20') {
      throw new Error(`validate-coupon failed for TEST20! Got: ${JSON.stringify(valData1)}`);
    }
    console.log('✅ TEST20 correctly validated as 20% discount');

    // 2.2 Expired coupon
    const valRes2 = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'TESTEXPIRED' })
    });
    const valData2 = await valRes2.json();
    console.log('validate-coupon (TESTEXPIRED):', valData2);
    if (valData2.valid || !valData2.reason?.toLowerCase().includes('expired')) {
      throw new Error(`validate-coupon did not reject expired coupon! Got: ${JSON.stringify(valData2)}`);
    }
    console.log('✅ TESTEXPIRED correctly rejected as expired');

    // 2.3 Deactivated coupon
    const valRes3 = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'TESTINACTIVE' })
    });
    const valData3 = await valRes3.json();
    console.log('validate-coupon (TESTINACTIVE):', valData3);
    if (valData3.valid || !valData3.reason?.toLowerCase().includes('inactive')) {
      throw new Error(`validate-coupon did not reject inactive coupon! Got: ${JSON.stringify(valData3)}`);
    }
    console.log('✅ TESTINACTIVE correctly rejected as inactive');

    // 2.4 Non-existent coupon
    const valRes4 = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'NONEXISTENT99' })
    });
    const valData4 = await valRes4.json();
    console.log('validate-coupon (NONEXISTENT99):', valData4);
    if (valData4.valid) {
      throw new Error(`validate-coupon did not reject non-existent coupon! Got: ${JSON.stringify(valData4)}`);
    }
    console.log('✅ NONEXISTENT99 correctly rejected as invalid');

    // -------------------------------------------------------------
    // Step 3: Test create-razorpay-order with Discount (Redemption 1)
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Testing create-razorpay-order with TEST20 (Redemption 1) ---');
    const giftId1 = crypto.randomUUID();
    createdGiftIds.push(giftId1);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId1,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Recipient One' }
      })
    });

    const orderRes1 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId1, coupon_code: 'TEST20' })
    });
    const orderData1 = await orderRes1.json();
    console.log('create-razorpay-order response 1:', orderData1);

    // Base price = 100, 20% discount = 80 (8000 paise)
    if (!orderData1.order_id || orderData1.amount !== 8000 || orderData1.amount_inr !== 80 || orderData1.coupon_code !== 'TEST20') {
      throw new Error(`create-razorpay-order failed to apply 20% discount! Got: ${JSON.stringify(orderData1)}`);
    }
    console.log('✅ Razorpay order 1 created with exact discounted ₹80 (8000 paise)');

    // Verify times_used is still 0 (only increments on confirmed payment)
    const chkRes1 = await fetch(`${SUPABASE_URL}/rest/v1/coupons?code=eq.TEST20`, { headers });
    const chk1 = (await chkRes1.json())[0];
    if (chk1.times_used !== 0) {
      throw new Error(`times_used must remain 0 before payment confirmation! Got: ${chk1.times_used}`);
    }
    console.log('✅ Coupon times_used correctly remains 0 before payment');

    // -------------------------------------------------------------
    // Step 4: Test verify-razorpay-payment and Atomic Increment 1
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Simulating Confirmed Payment for Gift 1 ---');
    // Call atomic increment to simulate confirmed payment verification
    const incRes1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coupon_usage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_code: 'TEST20' })
    });
    const incData1 = await incRes1.json();
    console.log('Atomic increment 1 response:', incData1);
    if (!incData1.success || incData1.times_used !== 1) {
      throw new Error(`Atomic increment failed! Expected times_used=1, got: ${JSON.stringify(incData1)}`);
    }
    console.log('✅ Coupon times_used atomically incremented to 1/2');

    // -------------------------------------------------------------
    // Step 5: Test Redemption 2 (2/2)
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing create-razorpay-order with TEST20 (Redemption 2) ---');
    const giftId2 = crypto.randomUUID();
    createdGiftIds.push(giftId2);

    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId2,
        status: 'draft',
        experience_id: 'birthday-film-glass',
        theme_id: 'glass',
        content: { recipientName: 'Recipient Two' }
      })
    });

    const orderRes2 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId2, coupon_code: 'TEST20' })
    });
    const orderData2 = await orderRes2.json();
    console.log('create-razorpay-order response 2:', orderData2);

    // Glass base price = 100 or 150. If 100, 20% discount = 80; if 150, 20% discount = 120
    const expectedGlassDisc = Math.round(orderData2.base_price_inr * 0.8);
    if (!orderData2.order_id || orderData2.amount_inr !== expectedGlassDisc) {
      throw new Error(`create-razorpay-order 2 discount incorrect! Expected ${expectedGlassDisc}, got: ${JSON.stringify(orderData2)}`);
    }
    console.log(`✅ Razorpay order 2 created with discount: Base ₹${orderData2.base_price_inr} -> Discounted ₹${orderData2.amount_inr}`);

    // Increment 2
    const incRes2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coupon_usage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_code: 'TEST20' })
    });
    const incData2 = await incRes2.json();
    console.log('Atomic increment 2 response:', incData2);
    if (!incData2.success || incData2.times_used !== 2) {
      throw new Error(`Atomic increment 2 failed! Expected times_used=2, got: ${JSON.stringify(incData2)}`);
    }
    console.log('✅ Coupon times_used atomically incremented to 2/2 (Limit Reached)');

    // -------------------------------------------------------------
    // Step 6: Test Attempt 3 (Usage Limit Reached Enforcement)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing Usage Limit Reached Rejection ---');

    // 6.1 validate-coupon rejection
    const valResLimit = await fetch(`${SUPABASE_URL}/functions/v1/validate-coupon`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: 'TEST20' })
    });
    const valDataLimit = await valResLimit.json();
    console.log('validate-coupon (TEST20 at 2/2 limit):', valDataLimit);
    if (valDataLimit.valid || !valDataLimit.reason?.toLowerCase().includes('limit')) {
      throw new Error(`validate-coupon did not reject coupon that reached usage limit! Got: ${JSON.stringify(valDataLimit)}`);
    }
    console.log('✅ validate-coupon correctly rejected coupon as "reached its usage limit"');

    // 6.2 create-razorpay-order rejection
    const giftId3 = crypto.randomUUID();
    createdGiftIds.push(giftId3);
    await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: giftId3,
        status: 'draft',
        experience_id: 'birthday-film',
        theme_id: 'paper',
        content: { recipientName: 'Recipient Three' }
      })
    });

    const orderRes3 = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gift_id: giftId3, coupon_code: 'TEST20' })
    });
    const orderData3 = await orderRes3.json();
    console.log('create-razorpay-order response 3 (limit reached):', orderData3);
    if (orderRes3.ok || !orderData3.error?.toLowerCase().includes('limit')) {
      throw new Error(`create-razorpay-order did not reject coupon exceeding usage limit! Got: ${JSON.stringify(orderData3)}`);
    }
    console.log('✅ create-razorpay-order correctly rejected order creation with limit reached error');

    console.log('\n================================================================');
    console.log('🎉 ALL COUPON & DISCOUNT SYSTEM INTEGRATION TESTS PASSED 100%!');
    console.log('================================================================');

  } finally {
    console.log('\n--- Cleaning up test records ---');
    for (const gid of createdGiftIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${gid}`, { method: 'DELETE', headers });
    }
    for (const cid of createdCouponIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=eq.${cid}`, { method: 'DELETE', headers });
    }
    console.log('✓ Cleanup completed.');
  }
}

run().catch(err => {
  console.error('\n❌ Integration test failed with error:', err);
  process.exit(1);
});
