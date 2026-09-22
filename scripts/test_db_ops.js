const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testOps() {
  console.log('--- Testing operations on gifts table ---');

  // 1. Can we select all gifts?
  const selRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=id,status,slug`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const rows = await selRes.json();
  console.log('Select rows count:', rows.length, rows);

  // 2. Can we delete a draft if we insert one?
  const testId = '33333333-4444-4555-8666-777777777777';
  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: testId,
      status: 'draft',
      experience_id: 'birthday-film',
      theme_id: 'paper',
      content: { test: true }
    })
  });
  console.log('Insert draft status:', insRes.status, await insRes.text());

  // 3. Can we delete this draft?
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${testId}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    }
  });
  console.log('Delete draft status:', delRes.status, await delRes.text());
}

testOps().catch(console.error);
