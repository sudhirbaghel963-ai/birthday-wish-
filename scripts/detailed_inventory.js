const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function run() {
  console.log('=== DETAILED INVENTORY ===\n');

  // 1. Gifts
  const giftsRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=id,slug,status,created_at,content`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const gifts = await giftsRes.json();
  console.log(`🎁 GIFTS TABLE (${Array.isArray(gifts) ? gifts.length : 'Error'} total rows):`);
  if (Array.isArray(gifts)) {
    gifts.forEach((g, i) => {
      console.log(`  ${i + 1}. ID: ${g.id} | Slug: ${g.slug || 'null'} | Status: ${g.status} | Recipient: ${g.content?.recipientName || 'Elena'} | Created: ${g.created_at}`);
    });
  } else {
    console.log('  Gifts error:', gifts);
  }
  console.log('');

  // 2. Experiences
  const expRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences?select=*`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const exps = await expRes.json();
  console.log(`✨ EXPERIENCES TABLE (${Array.isArray(exps) ? exps.length : 'Error'} total rows):`);
  if (Array.isArray(exps)) {
    exps.forEach(e => {
      console.log(`  - [${e.id}] ${e.name} (${e.price}, active: ${e.is_active})`);
    });
  } else {
    console.log('  Experiences response:', exps);
  }
  console.log('');

  // 3. Admin Users
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=id,email,role,created_at`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const admins = await adminRes.json();
  console.log(`👤 ADMIN_USERS TABLE (${Array.isArray(admins) ? admins.length : 'Error'} total rows):`);
  if (Array.isArray(admins)) {
    admins.forEach(a => {
      console.log(`  - ID: ${a.id} | Email: ${a.email} | Role: ${a.role}`);
    });
  } else {
    console.log('  Admin users error:', admins);
  }
  console.log('');

  // 4. Storage Buckets
  for (const b of ['gift-photos', 'gift-clips', 'gift-music']) {
    const sRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${b}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 1000 })
    });
    const files = await sRes.json();
    console.log(`📁 STORAGE BUCKET '${b}' (${Array.isArray(files) ? files.length : 'Error'} files):`);
    if (Array.isArray(files)) {
      files.forEach(f => console.log(`  - ${f.name} (${f.metadata?.size || 0} bytes)`));
    } else {
      console.log('  Error:', files);
    }
    console.log('');
  }
}

run().catch(console.error);
