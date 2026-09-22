import crypto from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';
const RAZORPAY_KEY_SECRET = 'IZp2gVHrukHNeHaMLb5FKVZP';

async function run() {
  console.log('--- STARTING EDIT PAID GIFT & VERSION HISTORY E2E TEST ---');

  const testSlug = 'test-e2e-rev-' + Date.now();
  const testOrderId = 'order_test_' + Date.now();
  const testPaymentId = 'pay_test_' + Date.now();
  const testSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  // 1. Insert an initial draft gift (v1) and verify payment to make it paid v1
  console.log('1. Creating initial draft gift (v1)...');
  const insertV1Res = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      experience_id: 'birthday-film',
      theme_id: 'paper',
      status: 'draft',
      content: {
        recipientName: 'Elena Original (v1)',
        scenes: {
          scene1_hero: { title: 'Happy Birthday Elena v1' }
        }
      }
    })
  });

  const v1Data = await insertV1Res.json();
  if (!v1Data || !v1Data[0]) {
    throw new Error('Failed to create v1 draft gift: ' + JSON.stringify(v1Data));
  }
  const v1DraftId = v1Data[0].id;
  console.log(`✓ v1 Draft Created: ID = ${v1DraftId}`);

  // Pay/Verify v1 draft
  const v1OrderId = 'order_v1_' + Date.now();
  const v1PaymentId = 'pay_v1_' + Date.now();
  const v1Sig = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${v1OrderId}|${v1PaymentId}`)
    .digest('hex');

  const v1VerifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gift_id: v1DraftId,
      razorpay_order_id: v1OrderId,
      razorpay_payment_id: v1PaymentId,
      razorpay_signature: v1Sig
    })
  });
  const v1VerifyResult = await v1VerifyRes.json();
  console.log('v1 Verification Result:', v1VerifyResult);

  const fetchV1 = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${v1DraftId}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const originalGift = (await fetchV1.json())[0];
  console.log(`✓ v1 Paid Gift Ready: ID = ${originalGift.id}, slug = ${originalGift.slug}, version = ${originalGift.version}`);

  // 2. Create a pending revision draft (revises_gift_id = originalGift.id)
  console.log('\n2. Creating revision draft (revises_gift_id)...');
  const insertDraftRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      experience_id: 'birthday-film',
      theme_id: 'paper',
      status: 'draft',
      revises_gift_id: originalGift.id,
      content: {
        recipientName: 'Elena Edited (v2)',
        scenes: {
          scene1_hero: { title: 'Happy Birthday Elena v2 Edited' }
        }
      }
    })
  });

  const draftData = await insertDraftRes.json();
  if (!draftData || !draftData[0]) {
    throw new Error('Failed to create revision draft: ' + JSON.stringify(draftData));
  }
  const revisionDraft = draftData[0];
  console.log(`✓ Revision Draft Created: ID = ${revisionDraft.id}, revises = ${revisionDraft.revises_gift_id}`);

  // 3. Call verify-razorpay-payment edge function with draft ID
  console.log('\n3. Invoking verify-razorpay-payment Edge Function for revision draft...');
  const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gift_id: revisionDraft.id,
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: testSignature
    })
  });

  const verifyResult = await verifyRes.json();
  console.log('Verification Edge Function Response:', verifyResult);

  if (!verifyResult.success || !verifyResult.is_revision) {
    throw new Error('Edge Function did not complete revision successfully: ' + JSON.stringify(verifyResult));
  }

  // 4. Assert Database State
  console.log('\n4. Verifying database state & version archives...');
  
  // 4a. Check gift_versions table for archived v1
  const verFetch = await fetch(`${SUPABASE_URL}/rest/v1/gift_versions?gift_id=eq.${originalGift.id}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const versions = await verFetch.json();
  console.log(`Found ${versions.length} archived version(s) in gift_versions table:`);
  console.log(versions);

  if (versions.length !== 1 || versions[0].version_number !== 1 || versions[0].content.recipientName !== 'Elena Original (v1)') {
    throw new Error('Archived version snapshot verification failed!');
  }
  console.log('✓ v1 snapshot verified accurately in gift_versions table.');

  // 4b. Check updated original gift in gifts table
  const origFetch = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${originalGift.id}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const updatedOrig = (await origFetch.json())[0];
  console.log('Updated Live Gift Row:', updatedOrig);

  if (updatedOrig.slug !== originalGift.slug) {
    throw new Error(`Slug changed! Expected ${originalGift.slug}, got ${updatedOrig.slug}`);
  }
  if (updatedOrig.version !== 2) {
    throw new Error(`Version was not incremented to 2! Got: ${updatedOrig.version}`);
  }
  if (updatedOrig.content.recipientName !== 'Elena Edited (v2)') {
    throw new Error(`Content not updated! Got: ${JSON.stringify(updatedOrig.content)}`);
  }
  if (updatedOrig.razorpay_payment_id !== testPaymentId) {
    throw new Error(`Payment ID not updated! Got: ${updatedOrig.razorpay_payment_id}`);
  }
  console.log('✓ Live gift retained exact public slug, updated to v2, and reflected new content.');

  // 4c. Verify draft row was cleaned up
  const draftCheck = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${revisionDraft.id}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const draftRows = await draftCheck.json();
  if (draftRows.length !== 0) {
    throw new Error('Temporary revision draft was not deleted!');
  }
  console.log('✓ Temporary revision draft row successfully deleted.');

  // 5. Cleanup test records
  console.log('\n5. Cleaning up test rows...');
  await fetch(`${SUPABASE_URL}/rest/v1/gift_versions?gift_id=eq.${originalGift.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${originalGift.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  console.log('✓ Test cleanup complete.');

  console.log('\n🎉 ALL REVISION & VERSION HISTORY TESTS PASSED PERFECTLY!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
