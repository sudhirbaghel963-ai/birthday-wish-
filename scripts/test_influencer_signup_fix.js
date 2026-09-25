import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function runTest() {
  console.log('=== TESTING INFLUENCER SIGNUP & FOREIGN KEY RESOLUTION ===\n');

  // Test Case 1: Brand new influencer registration
  const testUserId = randomUUID();
  const testEmail = `creator_${Date.now().toString().slice(-6)}@gmail.com`;
  const testRefCode = `CREATOR${Date.now().toString().slice(-4)}`;

  console.log('1. Attempting insertion into public.influencers table with:');
  console.log(`   user_id: ${testUserId}`);
  console.log(`   email: ${testEmail}`);
  console.log(`   referral_code: ${testRefCode}`);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: testUserId,
      name: 'Priya Sharma',
      email: testEmail,
      mobile: '+91 9876543210',
      social_handle: '@priyacreates',
      referral_code: testRefCode,
      payout_details: { type: 'upi', upi_id: 'priya@upi' },
      status: 'active',
      clicks: 0
    })
  });

  const insertData = await insertRes.json();
  console.log(`\nInsert HTTP Status: ${insertRes.status}`);

  if (!insertRes.ok) {
    console.error('❌ Insert failed:', insertData);
    process.exit(1);
  }

  console.log('✓ Successfully inserted influencer record:');
  console.log(`  ID: ${insertData[0].id}`);
  console.log(`  User ID: ${insertData[0].user_id}`);
  console.log(`  Name: ${insertData[0].name}`);
  console.log(`  Referral Code: ${insertData[0].referral_code}`);

  // Test Case 2: Querying the influencer record by user_id or email
  console.log('\n2. Querying influencer record by user_id...');
  const queryRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?user_id=eq.${testUserId}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const queried = await queryRes.json();
  if (queried.length === 1 && queried[0].referral_code === testRefCode) {
    console.log('✓ Successfully queried influencer profile for dashboard authorization.');
  } else {
    console.error('❌ Query failed:', queried);
    process.exit(1);
  }

  // Cleanup test row
  console.log('\n3. Cleaning up test influencer row...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=eq.${insertData[0].id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  console.log(`✓ Cleanup status: ${delRes.status}`);

  console.log('\n🎉 ALL INFLUENCER SIGNUP TESTS PASSED WITH ZERO FOREIGN KEY ERRORS!');
}

runTest().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
