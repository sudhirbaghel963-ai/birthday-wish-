const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const KEEP_GIFT_IDS = [
  '0433fc7e-510b-4c3e-bd78-e9d023fe66c4', // Paper Demo (slug: vadz2hxb5)
  '593b8c49-afd1-42b2-bdd4-ddc06deb7a73'  // Glass Demo (slug: vsue8h8kx)
];

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

async function main() {
  console.log('=====================================================');
  console.log('FINAL DATABASE & STORAGE CLEANUP - VELVET & KEEPSAKE');
  console.log('=====================================================\n');

  // 1. Fetch all gifts and inspect
  console.log('1. Querying all gifts in database...');
  const giftsRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=*`, { method: 'GET', headers });
  if (!giftsRes.ok) {
    console.error('Error fetching gifts:', await giftsRes.text());
    process.exit(1);
  }
  const allGifts = await giftsRes.json();
  console.log(`Found total ${allGifts.length} gifts in table.`);

  const keptGifts = allGifts.filter(g => KEEP_GIFT_IDS.includes(g.id));
  const deleteGifts = allGifts.filter(g => !KEEP_GIFT_IDS.includes(g.id));

  console.log(`\n🎁 Kept Demo Gifts (${keptGifts.length}):`);
  for (const g of keptGifts) {
    console.log(`  * ID: ${g.id} | Slug: ${g.slug} | Theme: ${g.theme_id} | Recipient: ${g.content?.recipientName || 'N/A'}`);
  }

  if (keptGifts.length !== 2) {
    console.error(`ERROR: Expected 2 demo gifts to keep, found ${keptGifts.length}. Aborting!`);
    process.exit(1);
  }

  console.log(`\n🗑️ Gifts to delete: ${deleteGifts.length}`);

  // Extract all asset URLs/filenames from kept gifts to protect them
  const preservedAssetFilenames = new Set();
  function extractFilenames(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      const matches = obj.match(/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|mp3|mp4|mov|m4a))/gi);
      if (matches) {
        matches.forEach(m => preservedAssetFilenames.add(m));
      }
      const parts = obj.split('/');
      const last = parts[parts.length - 1];
      if (last && (last.includes('.') || last.length > 10)) {
        preservedAssetFilenames.add(last);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(extractFilenames);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(extractFilenames);
    }
  }

  keptGifts.forEach(extractFilenames);
  console.log(`\nFound ${preservedAssetFilenames.size} asset patterns to protect for Demo gifts:`, Array.from(preservedAssetFilenames));

  // 2. Delete non-demo gifts
  console.log('\n2. Deleting non-demo gifts...');
  for (const g of deleteGifts) {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=eq.${g.id}`, { method: 'DELETE', headers });
    if (!delRes.ok) {
      console.error(`Failed to delete gift ${g.id}:`, await delRes.text());
    } else {
      process.stdout.write('.');
    }
  }
  console.log('\n✓ Non-demo gifts deleted.');

  // 3. Clean up Coupons
  console.log('\n3. Cleaning up coupons...');
  const couponsRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?select=*`, { method: 'GET', headers });
  const coupons = await couponsRes.json();
  console.log(`Found ${coupons.length} coupons.`);
  if (coupons.length > 0) {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    console.log(`✓ Deleted coupons: ${delRes.status}`);
  }

  // 4. Clean up Commissions
  console.log('\n4. Cleaning up commissions...');
  const commsRes = await fetch(`${SUPABASE_URL}/rest/v1/commissions?select=*`, { method: 'GET', headers });
  const comms = await commsRes.json();
  console.log(`Found ${comms.length} commissions.`);
  if (comms.length > 0) {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/commissions?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    console.log(`✓ Deleted commissions: ${delRes.status}`);
  }

  // 5. Clean up Influencers
  console.log('\n5. Cleaning up influencers...');
  const infRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?select=*`, { method: 'GET', headers });
  const infs = await infRes.json();
  console.log(`Found ${infs.length} influencers.`);
  if (infs.length > 0) {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    console.log(`✓ Deleted influencers: ${delRes.status}`);
  }

  // 6. Clean up Customer Profiles
  console.log('\n6. Cleaning up customer_profiles...');
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?select=*`, { method: 'GET', headers });
  const profs = await profRes.json();
  console.log(`Found ${profs.length} customer profiles.`);
  if (profs.length > 0) {
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?user_id=neq.00000000-0000-0000-0000-000000000000`, { method: 'DELETE', headers });
    console.log(`✓ Deleted customer profiles: ${delRes.status}`);
  }

  // 7. Clean up Storage Buckets
  console.log('\n7. Inspecting and cleaning storage buckets...');
  const BUCKETS = ['gift-photos', 'gift-clips', 'gift-music'];
  for (const bucket of BUCKETS) {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 1000 })
    });
    const files = await listRes.json();
    console.log(`Bucket '${bucket}' has ${files.length} file(s).`);

    const toDelete = [];
    const toKeep = [];
    for (const f of files) {
      const isPreserved = Array.from(preservedAssetFilenames).some(p => f.name.includes(p) || p.includes(f.name));
      if (isPreserved) {
        toKeep.push(f.name);
      } else {
        toDelete.push(f.name);
      }
    }
    console.log(`  - Protected (${toKeep.length}):`, toKeep);
    console.log(`  - Deleting (${toDelete.length}):`, toDelete);

    if (toDelete.length > 0) {
      const delRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefixes: toDelete })
      });
      console.log(`  ✓ Delete response status: ${delRes.status}`);
    }
  }

  // 8. Final Verification
  console.log('\n=====================================================');
  console.log('FINAL VERIFICATION RESULTS');
  console.log('=====================================================');

  const finalGiftsRes = await fetch(`${SUPABASE_URL}/rest/v1/gifts?select=id,slug,theme_id,status,price_paid,content`, { method: 'GET', headers });
  const finalGifts = await finalGiftsRes.json();
  console.log(`\nRemaining Gifts in DB (${finalGifts.length}):`);
  finalGifts.forEach(g => console.log(`  ✓ [${g.theme_id.toUpperCase()}] ID: ${g.id} | Slug: ${g.slug} | Status: ${g.status} | Recipient: ${g.content?.recipientName}`));

  const finalCouponsRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?select=*`, { method: 'GET', headers });
  console.log(`Remaining Coupons: ${(await finalCouponsRes.json()).length}`);

  const finalInfsRes = await fetch(`${SUPABASE_URL}/rest/v1/influencers?select=*`, { method: 'GET', headers });
  console.log(`Remaining Influencers: ${(await finalInfsRes.json()).length}`);

  const finalCommsRes = await fetch(`${SUPABASE_URL}/rest/v1/commissions?select=*`, { method: 'GET', headers });
  console.log(`Remaining Commissions: ${(await finalCommsRes.json()).length}`);

  const finalProfsRes = await fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?select=*`, { method: 'GET', headers });
  console.log(`Remaining Customer Profiles: ${(await finalProfsRes.json()).length}`);

  const finalAdminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=email,role`, { method: 'GET', headers });
  const finalAdmins = await finalAdminRes.json();
  console.log(`Admin Users (${finalAdmins.length}):`);
  finalAdmins.forEach(a => console.log(`  ✓ ${a.email} (${a.role})`));

  const finalExpRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences?select=id,title,is_active`, { method: 'GET', headers });
  const finalExps = await finalExpRes.json();
  console.log(`Experiences Catalog (${finalExps.length}):`);
  finalExps.forEach(e => console.log(`  ✓ ${e.id} - ${e.title} (Active: ${e.is_active})`));

  console.log('\n🎉 FINAL CLEANUP ACCOMPLISHED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error during cleanup:', err);
  process.exit(1);
});
