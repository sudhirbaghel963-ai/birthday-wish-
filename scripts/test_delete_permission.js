const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testDelete() {
  console.log('Testing delete permission on gifts...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.11111111-2222-4333-8444-555555555555`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    }
  });
  console.log('Delete response status:', res.status);
  const body = await res.text();
  console.log('Delete response body:', body);
}

testDelete().catch(console.error);
