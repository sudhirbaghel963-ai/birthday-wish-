const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  console.log('=== Step 1: Checking and Setting Per-Experience Prices in Database ===');
  
  // Update Paper to 100
  await fetch(`${SUPABASE_URL}/rest/v1/experiences?id=eq.birthday-film`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ price: '100', is_active: true })
  });

  // Update Glass to 150
  await fetch(`${SUPABASE_URL}/rest/v1/experiences?id=eq.birthday-film-glass`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ price: '150', is_active: true })
  });

  // Fetch experiences
  const expRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences?select=id,name,price,is_active&order=sort_order.asc`, {
    headers
  });
  const experiences = await expRes.json();
  console.log('Experiences in database:', experiences);

  const paperExp = experiences.find(e => e.id === 'birthday-film');
  const glassExp = experiences.find(e => e.id === 'birthday-film-glass');

  console.log(`Paper Edition Price: ₹${paperExp?.price}`);
  console.log(`Glass Edition Price: ₹${glassExp?.price}`);

  if (String(paperExp?.price) !== '100' || String(glassExp?.price) !== '150') {
    throw new Error(`Prices do not match expected ₹100 and ₹150! Got Paper: ${paperExp?.price}, Glass: ${glassExp?.price}`);
  }

  console.log('\n=== Step 2: Testing Server-Side Order Creation for Paper (₹100) ===');
  const paperDraftId = crypto.randomUUID();
  await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: paperDraftId,
      status: 'draft',
      experience_id: 'birthday-film',
      theme_id: 'paper',
      content: { recipientName: 'Test Paper' }
    })
  });

  const resPaper = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ gift_id: paperDraftId })
  });

  const paperOrder = await resPaper.json();
  console.log('Paper Order Response:', paperOrder);
  if (!paperOrder.order_id || paperOrder.amount !== 10000 || paperOrder.amount_inr !== 100) {
    throw new Error(`Paper order amount incorrect! Expected 10000 paise / ₹100, got: ${JSON.stringify(paperOrder)}`);
  }
  console.log('✅ Paper Edition order created with exact ₹100 (10,000 paise)');

  console.log('\n=== Step 3: Testing Server-Side Order Creation for Glass (₹150) ===');
  const glassDraftId = crypto.randomUUID();
  await fetch(`${SUPABASE_URL}/rest/v1/gifts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: glassDraftId,
      status: 'draft',
      experience_id: 'birthday-film-glass',
      theme_id: 'glass',
      content: { recipientName: 'Test Glass' }
    })
  });

  const resGlass = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ gift_id: glassDraftId })
  });

  const glassOrder = await resGlass.json();
  console.log('Glass Order Response:', glassOrder);
  if (!glassOrder.order_id || glassOrder.amount !== 15000 || glassOrder.amount_inr !== 150) {
    throw new Error(`Glass order amount incorrect! Expected 15000 paise / ₹150, got: ${JSON.stringify(glassOrder)}`);
  }
  console.log('✅ Glass Edition order created with exact ₹150 (15,000 paise)');

  console.log('\n=== Step 4: Cleaning up Test Draft Rows ===');
  await fetch(`${SUPABASE_URL}/rest/v1/gifts?id=in.(${paperDraftId},${glassDraftId})`, {
    method: 'DELETE',
    headers
  });
  console.log('✅ Cleaned up temporary test gifts');

  console.log('\n🎉 ALL PER-EXPERIENCE DYNAMIC PRICING TESTS PASSED PERFECTLY!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
