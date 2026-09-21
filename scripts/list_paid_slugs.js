const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function listPaidSlugs() {
  const url = `${SUPABASE_URL}/rest/v1/gifts?status=eq.paid&select=id,slug,theme_id,status&limit=10`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const rows = await response.json();
  console.log('Paid rows in database:', rows);
}

listPaidSlugs();
