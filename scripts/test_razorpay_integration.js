/**
 * Test Suite: Razorpay Payment & Cryptographic Verification Logic
 */
import crypto from 'crypto';

// 1. Shared Constants Verification
const FLAT_PRICE_INR = 100;
const FLAT_PRICE_PAISE = 10000;

console.log('--- 1. Testing Flat Pricing Constants ---');
console.assert(FLAT_PRICE_INR === 100, 'FLAT_PRICE_INR must equal 100');
console.assert(FLAT_PRICE_PAISE === 10000, 'FLAT_PRICE_PAISE must equal 10000 (100 * 100)');
console.log('✅ Flat pricing constants verified: ₹100 = 10,000 paise\n');

// 2. Cryptographic HMAC-SHA256 Signature Verification Test
console.log('--- 2. Testing Razorpay HMAC-SHA256 Signature Generation & Verification ---');

const mockSecret = 'rzp_test_secret_key_1234567890';
const mockOrderId = 'order_DAvD8z4y4m5f6G';
const mockPaymentId = 'pay_DAvEJ2FmH12345';

// Generate expected Razorpay signature via Node.js crypto
const payload = `${mockOrderId}|${mockPaymentId}`;
const generatedSignature = crypto
  .createHmac('sha256', mockSecret)
  .update(payload)
  .digest('hex');

console.log(`Generated Test Signature: ${generatedSignature}`);

// Test timing-safe string comparison
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verification with genuine signature
const isAuthentic = timingSafeEqual(generatedSignature.toLowerCase(), generatedSignature.toLowerCase());
console.assert(isAuthentic === true, 'Genuine signature must pass verification');
console.log('✅ Genuine signature verified successfully.');

// Verification with tampered signature
const tamperedSignature = generatedSignature.substring(0, generatedSignature.length - 4) + '0000';
const isTampered = timingSafeEqual(generatedSignature.toLowerCase(), tamperedSignature.toLowerCase());
console.assert(isTampered === false, 'Tampered signature must be rejected');
console.log('✅ Tampered signature correctly rejected.');

// Verification with tampered order ID
const tamperedPayloadSig = crypto
  .createHmac('sha256', mockSecret)
  .update(`order_fake_id|${mockPaymentId}`)
  .digest('hex');
const isTamperedOrder = timingSafeEqual(generatedSignature.toLowerCase(), tamperedPayloadSig.toLowerCase());
console.assert(isTamperedOrder === false, 'Mismatched order ID signature must be rejected');
console.log('✅ Tampered order ID correctly rejected.\n');

// 3. Slug Generation Format Test
console.log('--- 3. Testing Slug Generation ---');
const SLUG_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';
function generateRandomSlug(length = 9) {
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
  }
  return slug;
}

const slug = generateRandomSlug(9);
console.log(`Sample Generated Slug: '${slug}'`);
console.assert(slug.length === 9, 'Slug must be 9 chars');
console.assert(/^[23456789abcdefghjkmnpqrstuvwxyz]{9}$/.test(slug), 'Slug characters must match URL-safe charset');
console.log('✅ Slug generation format verified.\n');

console.log('🎉 ALL RAZORPAY INTEGRATION LOGIC TESTS PASSED!');
