/**
 * Test password reset flow
 */
const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = { hostname: 'localhost', port: 8080, path, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); } catch { resolve({ status: res.statusCode, body: chunks }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== 1. Request password reset ===');
  const r1 = await request('POST', '/auth/forgot-password', { email: 'hassan@example.com' });
  console.log(`Status: ${r1.status}`, JSON.stringify(r1.body, null, 2));

  if (r1.body.previewUrl) {
    console.log('\n📧 Email preview:', r1.body.previewUrl);
  }

  // Get the code from the database directly for testing
  console.log('\n=== 2. Get code from DB (testing only) ===');
  const db = require('./config/db');
  const tokenResult = await db.query(
    "SELECT token FROM password_reset_token WHERE email = 'hassan@example.com' AND used = FALSE ORDER BY created_at DESC LIMIT 1"
  );
  const code = tokenResult.rows[0]?.token;
  console.log('Reset code:', code);

  console.log('\n=== 3. Reset password with wrong code ===');
  const r2 = await request('POST', '/auth/reset-password', { email: 'hassan@example.com', code: '000000', newPassword: 'newpass123' });
  console.log(`Status: ${r2.status}`, JSON.stringify(r2.body, null, 2));

  console.log('\n=== 4. Reset password with correct code ===');
  const r3 = await request('POST', '/auth/reset-password', { email: 'hassan@example.com', code, newPassword: 'newpass123' });
  console.log(`Status: ${r3.status}`, JSON.stringify(r3.body, null, 2));

  console.log('\n=== 5. Login with NEW password ===');
  const r4 = await request('POST', '/auth/login', { email: 'hassan@example.com', password: 'newpass123' });
  console.log(`Status: ${r4.status}`, JSON.stringify(r4.body, null, 2));

  console.log('\n=== 6. Login with OLD password (should fail) ===');
  const r5 = await request('POST', '/auth/login', { email: 'hassan@example.com', password: 'student123' });
  console.log(`Status: ${r5.status}`, JSON.stringify(r5.body, null, 2));

  console.log('\n✅ Password reset test complete!');
  process.exit(0);
}

run().catch(console.error);
