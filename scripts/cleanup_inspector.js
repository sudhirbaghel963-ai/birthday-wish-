const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function main() {
  console.log('--- Inspecting Supabase Data ---');

  // 1. Fetch gifts
  const giftsRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const gifts = await giftsRes.json();
  console.log(`Gifts count (via REST):`, Array.isArray(gifts) ? gifts.length : gifts);
  if (Array.isArray(gifts)) {
    console.log('Gifts sample:', gifts.map(g => ({ id: g.id, slug: g.slug, status: g.status, recipient: g.content?.recipientName })));
  }

  // 2. Fetch experiences
  const expRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const exps = await expRes.json();
  console.log(`Experiences count:`, Array.isArray(exps) ? exps.length : exps);
  if (Array.isArray(exps)) {
    console.log('Experiences:', exps.map(e => ({ id: e.id, name: e.name, price: e.price, is_active: e.is_active })));
  }

  // 3. Fetch admin_users
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const admins = await adminRes.json();
  console.log(`Admin users count:`, Array.isArray(admins) ? admins.length : admins);
  if (Array.isArray(admins)) {
    console.log('Admins:', admins.map(a => ({ id: a.id, email: a.email, role: a.role })));
  }

  // 4. Inspect storage buckets
  for (const bucket of ['gift-photos', 'gift-clips', 'gift-music']) {
    const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 100, sortBy: { column: 'name', order: 'asc' } })
    });
    const files = await storageRes.json();
    console.log(`Storage bucket '${bucket}' contents:`, files);
  }
}

main().catch(console.error);
