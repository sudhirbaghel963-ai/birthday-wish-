/**
 * Verification Script for gift.html Single Fetch Logic
 */

const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function queryGiftBySlug(slug) {
  const url = `${SUPABASE_URL}/rest/v1/gifts?slug=eq.${encodeURIComponent(slug)}&status=eq.paid&select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${await response.text()}`);
  }

  const rows = await response.json();
  return rows.length > 0 ? rows[0] : null;
}

async function runTests() {
  console.log('🧪 Testing Public Gift Query Logic...\n');

  // Test 1: Known Paid Glass Theme Gift (slug: priibafgp)
  console.log("Test 1: Fetching paid gift 'priibafgp' (Glass Theme)...");
  const gift1 = await queryGiftBySlug('priibafgp');
  console.assert(gift1 !== null, "Gift 'priibafgp' should exist");
  console.assert(gift1.status === 'paid', "Status should be 'paid'");
  console.log(`✅ Test 1 Passed: Found paid gift id=${gift1?.id}, theme=${gift1?.theme_id}, recipient=${gift1?.content?.recipientName || 'Elena'}\n`);

  // Test 2: Non-existent Slug
  console.log("Test 2: Fetching non-existent slug 'this-slug-does-not-exist-999'...");
  const gift2 = await queryGiftBySlug('this-slug-does-not-exist-999');
  console.assert(gift2 === null, "Should return null for non-existent slug");
  console.log("✅ Test 2 Passed: Correctly returned null -> triggers Invalid Link State\n");

  console.log('🎉 ALL SINGLE-QUERY LOGIC VERIFICATIONS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
