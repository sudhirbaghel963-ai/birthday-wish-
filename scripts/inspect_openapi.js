const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function getOpenApi() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const schema = await res.json();
  console.log('Tables / Paths exposed:');
  console.log(Object.keys(schema.paths || {}));
  console.log('\nDefinitions exposed:');
  console.log(Object.keys(schema.definitions || {}));
}

getOpenApi().catch(console.error);
