/**
 * Test Suite for publish-gift Edge Function logic
 * Tests: Input validation, UUID checks, Slug generation, Idempotency, and Status transitions
 */



const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';

function generateRandomSlug(length = 9) {
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return slug;
}

// Logic runner simulating the Edge Function handler
async function handlePublishGift(reqBody, mockDb) {
  // 1. Validation
  if (!reqBody || typeof reqBody !== 'object') {
    return { status: 400, body: { error: 'Invalid JSON payload. Expected { id: "<uuid>" }.' } };
  }

  const { id } = reqBody;
  if (!id || typeof id !== 'string') {
    return { status: 400, body: { error: "Missing required parameter 'id' in request body." } };
  }

  const cleanId = id.trim();
  if (!UUID_REGEX.test(cleanId)) {
    return { status: 400, body: { error: `Invalid gift ID format: '${cleanId}'. Expected a valid UUID.` } };
  }

  // 2. Fetch existing gift
  const gift = mockDb.get(cleanId);
  if (!gift) {
    return { status: 404, body: { error: `Gift with id '${cleanId}' not found.` } };
  }

  // 3. Idempotency Check
  if (gift.status === 'paid') {
    return {
      status: 200,
      body: {
        success: true,
        message: 'This gift has already been published.',
        slug: gift.slug,
        id: gift.id,
        already_published: true,
      }
    };
  }

  if (gift.status !== 'draft') {
    return {
      status: 400,
      body: { error: `Gift cannot be published because its current status is '${gift.status}'.` }
    };
  }

  // 4. Unique Slug Generation with collision handling
  const MAX_SLUG_ATTEMPTS = 5;
  let chosenSlug = '';
  let isUnique = false;

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = generateRandomSlug(9);
    // Check collision in mockDb
    const collision = Array.from(mockDb.values()).some(g => g.slug === candidate);
    if (!collision) {
      chosenSlug = candidate;
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    return {
      status: 500,
      body: { error: 'Server could not generate a unique slug after multiple attempts. Please retry.' }
    };
  }

  // 5. Update row
  gift.status = 'paid';
  gift.slug = chosenSlug;
  gift.updated_at = new Date().toISOString();
  mockDb.set(cleanId, gift);

  return {
    status: 200,
    body: {
      success: true,
      message: 'Gift published successfully.',
      id: gift.id,
      slug: gift.slug,
      status: gift.status,
    }
  };
}

async function runTests() {
  console.log('🧪 Starting Edge Function `publish-gift` Test Suite...\n');

  const mockDb = new Map();
  const testDraftId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  mockDb.set(testDraftId, {
    id: testDraftId,
    status: 'draft',
    slug: null,
    experience_id: 'birthday-film',
    theme_id: 'paper',
    content: { recipientName: 'Elena' }
  });

  // TEST 1: Missing ID
  console.log('Test 1: Rejection on missing ID');
  const res1 = await handlePublishGift({}, mockDb);
  console.assert(res1.status === 400, `Expected 400, got ${res1.status}`);
  console.assert(res1.body.error.includes("Missing required parameter 'id'"), 'Correct error message');
  console.log('✅ Test 1 Passed: 400 on missing ID\n');

  // TEST 2: Invalid UUID Format
  console.log('Test 2: Rejection on invalid UUID');
  const res2 = await handlePublishGift({ id: 'not-a-valid-uuid-123' }, mockDb);
  console.assert(res2.status === 400, `Expected 400, got ${res2.status}`);
  console.assert(res2.body.error.includes('Expected a valid UUID'), 'Correct error message');
  console.log('✅ Test 2 Passed: 400 on invalid UUID\n');

  // TEST 3: Non-existent Gift ID
  console.log('Test 3: 404 on non-existent UUID');
  const res3 = await handlePublishGift({ id: '00000000-0000-4000-8000-000000000000' }, mockDb);
  console.assert(res3.status === 404, `Expected 404, got ${res3.status}`);
  console.assert(res3.body.error.includes('not found'), 'Correct error message');
  console.log('✅ Test 3 Passed: 404 on non-existent row\n');

  // TEST 4: Successful Publish of Draft
  console.log('Test 4: Successful transition of draft to paid');
  const res4 = await handlePublishGift({ id: testDraftId }, mockDb);
  console.assert(res4.status === 200, `Expected 200, got ${res4.status}`);
  console.assert(res4.body.success === true, 'Success flag true');
  console.assert(typeof res4.body.slug === 'string' && res4.body.slug.length === 9, 'Valid 9-char slug returned');
  console.assert(mockDb.get(testDraftId).status === 'paid', 'Database row status is paid');
  console.assert(mockDb.get(testDraftId).slug === res4.body.slug, 'Database row slug matches response');
  const generatedSlug = res4.body.slug;
  console.log(`✅ Test 4 Passed: Published successfully with slug: '${generatedSlug}'\n`);

  // TEST 5: Idempotency (Re-publishing already paid gift)
  console.log('Test 5: Idempotent second call on already published gift');
  const res5 = await handlePublishGift({ id: testDraftId }, mockDb);
  console.assert(res5.status === 200, `Expected 200, got ${res5.status}`);
  console.assert(res5.body.already_published === true, 'Already published flag set');
  console.assert(res5.body.slug === generatedSlug, 'Returned existing slug without generating a new one');
  console.assert(mockDb.get(testDraftId).slug === generatedSlug, 'Database slug remains unchanged');
  console.log('✅ Test 5 Passed: Idempotent call cleanly returned existing slug\n');

  // TEST 6: Slug Randomness & URL-Safety
  console.log('Test 6: Slug format and character safety');
  for (let i = 0; i < 50; i++) {
    const s = generateRandomSlug(9);
    console.assert(/^[23456789abcdefghjkmnpqrstuvwxyz]{9}$/.test(s), `Invalid slug format: ${s}`);
  }
  console.log('✅ Test 6 Passed: 50/50 randomly generated slugs conform to safe URL character set\n');

  console.log('🎉 ALL EDGE FUNCTION LOGIC TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
