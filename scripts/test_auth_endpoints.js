const SUPABASE_URL = 'https://jwwwhtkfincfhhmvcjkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rwa9I2jjY3PpNxuDIuzGHg_tbidOkej';

async function testAuth() {
  console.log('Testing Supabase Auth endpoints...');

  // Test admin_users verify_admin_login RPC
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_admin_login`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_email: 'sudhirbaghel963@email.com',
      p_password_hash: 'dummy'
    })
  });
  console.log('verify_admin_login RPC status:', rpcRes.status);
  console.log('verify_admin_login RPC response:', await rpcRes.text());
}

testAuth().catch(console.error);
