const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testRpc() {
  console.log('--- Testing PostgreSQL RPC functions on Supabase ---');

  // Let's create a temporary draft row first
  const draftId = 'd' + Math.random().toString(36).substring(2, 15) + '-test-4444-8888-123456789abc';
  // Standard UUID format:
  const testUuid = '11111111-2222-4333-8444-555555555555';

  const insertUrl = `${SUPABASE_URL}/rest/v1/gifts`;
  const insertRes = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: testUuid,
      status: 'draft',
      experience_id: 'birthday-film',
      theme_id: 'paper',
      content: { recipientName: 'Diagnostic Test' }
    })
  });
  console.log('Insert draft status:', insertRes.status);
  const insertBody = await insertRes.text();
  console.log('Insert draft body:', insertBody);

  // Now test calling complete_gift_payment RPC
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/complete_gift_payment`;
  const rpcRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      p_gift_id: testUuid,
      p_payment_id: 'diag_test_payment',
      p_price_paid: 100.00
    })
  });

  console.log('RPC complete_gift_payment status:', rpcRes.status);
  const rpcBody = await rpcRes.text();
  console.log('RPC complete_gift_payment body:', rpcBody);
}

testRpc();
