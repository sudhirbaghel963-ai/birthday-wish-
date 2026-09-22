const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const BUCKETS = ['gift-photos', 'gift-clips', 'gift-music'];

async function listAllFiles(bucket) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefix: '', limit: 1000 })
  });

  if (!res.ok) {
    throw new Error(`Failed to list bucket '${bucket}': ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

async function deleteFiles(bucket, fileNames) {
  if (!fileNames || fileNames.length === 0) return { deleted: 0 };

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: fileNames })
  });

  if (!res.ok) {
    throw new Error(`Failed to delete files in '${bucket}': ${res.status} ${await res.text()}`);
  }

  const result = await res.json();
  return { deleted: Array.isArray(result) ? result.length : fileNames.length, result };
}

async function runCleanup() {
  console.log('==============================================');
  console.log('STEP 3: CLEANUP OF ALL SUPABASE STORAGE ASSETS');
  console.log('==============================================\n');

  for (const bucket of BUCKETS) {
    console.log(`🔍 Inspecting storage bucket: '${bucket}'...`);
    const files = await listAllFiles(bucket);
    console.log(`   Found ${files.length} file(s) in '${bucket}'.`);

    if (files.length > 0) {
      const fileNames = files.map(f => f.name);
      console.log(`   Deleting ${fileNames.length} file(s)...`);
      const { deleted } = await deleteFiles(bucket, fileNames);
      console.log(`   ✅ Successfully removed ${deleted} file(s) from '${bucket}'.`);
    } else {
      console.log(`   Bucket '${bucket}' is already empty.`);
    }

    // Verify after deletion
    const remaining = await listAllFiles(bucket);
    console.log(`   📊 Verification: '${bucket}' now contains ${remaining.length} file(s).\n`);
  }

  console.log('🎉 ALL STORAGE BUCKET CONTENTS HAVE BEEN COMPLETELY CLEANED UP!\n');
}

runCleanup().catch(err => {
  console.error('❌ Storage cleanup failed:', err);
  process.exit(1);
});
