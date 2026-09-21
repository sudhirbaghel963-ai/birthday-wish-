const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function diagnose() {
  console.log('--- Diagnosing Supabase Edge Function `publish-gift` ---');

  // Test 1: OPTIONS preflight
  console.log('\n1. Testing OPTIONS preflight request...');
  try {
    const optRes = await fetch(`${SUPABASE_URL}/functions/v1/publish-gift`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Origin': 'http://localhost:5173',
      }
    });
    console.log(`OPTIONS Status: ${optRes.status} ${optRes.statusText}`);
    console.log('OPTIONS Headers:', Object.fromEntries(optRes.headers.entries()));
    const optBody = await optRes.text();
    console.log('OPTIONS Body:', optBody);
  } catch (err) {
    console.error('OPTIONS failed:', err);
  }

  // Test 2: POST request with Anon Key
  console.log('\n2. Testing POST request with Anon Key & Dummy ID...');
  try {
    const postRes = await fetch(`${SUPABASE_URL}/functions/v1/publish-gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ id: '218c1453-f691-4348-98fd-01d6f44fe778' })
    });
    console.log(`POST Status: ${postRes.status} ${postRes.statusText}`);
    console.log('POST Headers:', Object.fromEntries(postRes.headers.entries()));
    const postBody = await postRes.text();
    console.log('POST Body:', postBody);
  } catch (err) {
    console.error('POST failed:', err);
  }
}

diagnose();
