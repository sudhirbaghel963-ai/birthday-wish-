const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testEdgeFn() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/publish-gift`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: '218c1453-f691-4348-98fd-01d6f44fe778' })
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

testEdgeFn().catch(console.error);
