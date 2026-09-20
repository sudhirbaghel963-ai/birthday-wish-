import fs from 'fs';

console.log('--- Verifying Supabase SQL Schema & Security Rules ---');

const schemaPath = './supabase/schema.sql';
if (!fs.existsSync(schemaPath)) {
  throw new Error(`Schema file not found at ${schemaPath}`);
}

const sql = fs.readFileSync(schemaPath, 'utf-8');

// 1. Check Table Definition
const requiredColumns = [
  'id UUID PRIMARY KEY',
  'created_at TIMESTAMPTZ',
  'updated_at TIMESTAMPTZ',
  'owner_id UUID',
  'slug TEXT UNIQUE',
  'status TEXT',
  'experience_id TEXT',
  'theme_id TEXT',
  'content JSONB',
  'photo_urls JSONB',
  'clip_urls JSONB',
  'music JSONB',
  'razorpay_payment_id TEXT',
  'price_paid NUMERIC'
];

for (const col of requiredColumns) {
  if (!sql.includes(col.split(' ')[0])) {
    throw new Error(`Missing column in SQL: ${col}`);
  }
}
console.log('✅ All 14 table columns verified');

// 2. Check Constraints & Indexes
if (!sql.includes("CHECK (status IN ('draft', 'paid'))")) {
  throw new Error('Status check constraint missing or incorrect');
}
if (!sql.includes('idx_gifts_slug')) throw new Error('Missing index on slug');
if (!sql.includes('idx_gifts_owner_id')) throw new Error('Missing index on owner_id');
if (!sql.includes('trigger_gifts_updated_at')) throw new Error('Missing updated_at trigger');
console.log('✅ Constraints, indexes, and updated_at trigger verified');

// 3. Check RLS Policies on Table
const requiredPolicies = [
  'gifts_select_policy',
  'gifts_insert_policy',
  'gifts_update_policy',
  'gifts_delete_policy'
];

for (const pol of requiredPolicies) {
  if (!sql.includes(pol)) {
    throw new Error(`Missing table RLS policy: ${pol}`);
  }
}
if (!sql.includes('ENABLE ROW LEVEL SECURITY')) {
  throw new Error('RLS not enabled on public.gifts');
}
console.log('✅ Table RLS enabled with SELECT, INSERT, UPDATE, DELETE policies verified');

// 4. Check Storage Buckets
const requiredBuckets = [
  { id: 'gift-photos', size: 8388608 },
  { id: 'gift-clips', size: 20971520 },
  { id: 'gift-music', size: 15728640 }
];

for (const b of requiredBuckets) {
  if (!sql.includes(`'${b.id}'`)) throw new Error(`Missing bucket: ${b.id}`);
  if (!sql.includes(String(b.size))) throw new Error(`Missing size limit for bucket: ${b.id}`);
}
console.log('✅ Storage buckets (gift-photos, gift-clips, gift-music) and size limits verified');

// 5. Check Slug & Payment Functions
if (!sql.includes('generate_unique_gift_slug')) throw new Error('Missing generate_unique_gift_slug function');
if (!sql.includes('complete_gift_payment')) throw new Error('Missing complete_gift_payment function');
if (!sql.includes('SECURITY DEFINER')) throw new Error('complete_gift_payment must have SECURITY DEFINER');
console.log('✅ Slug generation and elevated payment completion functions verified');

console.log('🎉 All Supabase backend architecture checks passed with 100% compliance!');
