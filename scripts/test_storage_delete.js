const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testStorageDelete() {
  console.log('Testing storage delete on test_photo.png in gift-photos...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/gift-photos`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: ['test_photo.png'] })
  });
  console.log('Storage delete status:', res.status);
  console.log('Storage delete body:', await res.text());
}

testStorageDelete().catch(console.error);
