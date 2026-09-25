import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testAdminDelete() {
  console.log('--- Testing Admin Gift Deletion Persistence ---');

  // 1. Sign in as admin
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: 'sudhirbaghel963@gmail.com',
      password: 'Qwerty#2005'
    })
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData.access_token) {
    console.error('Admin login failed:', authData);
    process.exit(1);
  }
  const adminToken = authData.access_token;
  console.log('✓ Admin authenticated:', authData.user.email);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${adminToken}`,
    'Prefer': 'return=representation'
  };

  // 2. Create a temporary throwaway test gift (owned by a random non-admin customer)
  const testGiftId = randomUUID();
  const testCustomerId = randomUUID();
  
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      id: testGiftId,
      owner_id: testCustomerId,
      status: 'paid',
      slug: 'test-del-' + Date.now().toString().slice(-6),
      experience_id: 'birthday-film',
      theme_id: 'paper',
      content: { recipientName: 'Throwaway Test' },
      price_paid: 100
    })
  });

  const inserted = await insertRes.json();
  if (!insertRes.ok || !inserted) {
    console.error('Failed to create throwaway test gift:', inserted);
    process.exit(1);
  }
  console.log(`✓ Throwaway test gift created: ${testGiftId} (Status: paid, Owner: ${testCustomerId})`);

  // 3. Delete the gift using the admin's session
  const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testGiftId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });

  if (!deleteRes.ok) {
    console.error('❌ Admin delete failed with status:', deleteRes.status, await deleteRes.text());
    process.exit(1);
  }
  const deletedRows = await deleteRes.json();
  console.log('✓ Admin delete response rows:', deletedRows);

  // 4. Verify the row is ACTUALLY gone from the database
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testGiftId}`, {
    method: 'GET',
    headers: adminHeaders
  });
  const checkRows = await checkRes.json();

  if (checkRows && checkRows.length > 0) {
    console.error('❌ FAIL: Row still exists in database after delete! Deletion did not persist.');
    process.exit(1);
  }

  console.log('🎉 SUCCESS: Row confirmed deleted from database! Admin gift deletion genuinely persists.');
}

testAdminDelete();

