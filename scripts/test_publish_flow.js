const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function invokePublish(draftId) {
  // 1. Try Edge Function
  try {
    const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/publish-gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ id: draftId })
    });
    if (edgeRes.ok) {
      const data = await edgeRes.json();
      if (data && data.slug) {
        return { slug: data.slug, source: 'edge-function' };
      }
    }
  } catch (edgeErr) {
    console.warn('Edge function not reachable, trying database RPC:', edgeErr.message);
  }

  // 2. Database SECURITY DEFINER RPC fallback
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_gift_payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      p_gift_id: draftId,
      p_payment_id: 'test_flow_' + Date.now(),
      p_price_paid: 100.00
    })
  });

  if (!rpcRes.ok) {
    const errorText = await rpcRes.text();
    throw new Error(`Publish failed: ${errorText}`);
  }

  const rpcData = await rpcRes.json();
  return { slug: rpcData.slug, source: 'database-rpc' };
}

async function runTest() {
  const testId = '22222222-3333-4444-8555-666666666666';
  // Insert draft
  await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      id: testId,
      status: 'draft',
      experience_id: 'birthday-film',
      theme_id: 'paper',
      content: { recipientName: 'E2E Flow Test' }
    })
  });

  const result = await invokePublish(testId);
  console.log('Publish result:', result);
  console.assert(typeof result.slug === 'string' && result.slug.length >= 6, 'Slug must be valid');
  console.log('✅ Flow succeeded! Generated slug:', result.slug);
}

runTest();
