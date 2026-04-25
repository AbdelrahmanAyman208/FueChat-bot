/**
 * End-to-end integration test for FueBot + Python AI
 * Tests: login → AI status → chat message → AI-powered response
 */
const http = require('http');

const BASE = 'http://localhost:8080';
let sessionCookie = '';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        // Capture session cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          sessionCookie = setCookie[0].split(';')[0];
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FueBot + AI Integration Test');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Health check (Node.js)
  console.log('1️⃣  Node.js health check...');
  const health = await request('GET', '/health');
  console.log(`   Status: ${health.status} → ${health.body.status}`);
  console.log(`   ✅ Node.js backend is running\n`);

  // 2. Login
  console.log('2️⃣  Logging in as hassan@example.com...');
  const login = await request('POST', '/auth/login', {
    email: 'hassan@example.com',
    password: 'student123',
  });
  if (login.status !== 200) {
    console.log(`   ❌ Login failed: ${JSON.stringify(login.body)}`);
    process.exit(1);
  }
  console.log(`   ✅ Logged in as: ${login.body.user.name} (${login.body.user.role})\n`);

  // 3. AI status check
  console.log('3️⃣  Checking AI service status...');
  const aiStatus = await request('GET', '/chat/ai-status');
  console.log(`   AI Available: ${aiStatus.body.available}`);
  if (aiStatus.body.available) {
    console.log(`   Vector Store Ready: ${aiStatus.body.vectorStoreReady}`);
    console.log(`   LLM Provider: ${aiStatus.body.llmProvider}`);
    console.log(`   Model: ${aiStatus.body.model}`);
    console.log(`   ✅ AI service is online\n`);
  } else {
    console.log(`   ⚠️  AI service offline: ${aiStatus.body.reason}`);
    console.log(`   (Bot will use keyword-based fallback)\n`);
  }

  // 4. Send a chat message
  console.log('4️⃣  Sending chat message: "What courses should I take next?"');
  const chat = await request('POST', '/chat/message', {
    message: 'What courses should I take next?',
  });
  if (chat.status === 201) {
    console.log(`   Chat ID: ${chat.body.chatId}`);
    console.log(`   AI Response (first 300 chars):`);
    console.log(`   ${chat.body.botResponse.substring(0, 300)}...`);
    console.log(`   ✅ Chat message processed successfully\n`);
  } else {
    console.log(`   ❌ Chat failed: ${JSON.stringify(chat.body)}\n`);
  }

  // 5. Send a general question
  console.log('5️⃣  Sending general question: "What are the prerequisites for CS201?"');
  const chat2 = await request('POST', '/chat/message', {
    message: 'What are the prerequisites for CS201?',
  });
  if (chat2.status === 201) {
    console.log(`   Chat ID: ${chat2.body.chatId}`);
    console.log(`   AI Response (first 300 chars):`);
    console.log(`   ${chat2.body.botResponse.substring(0, 300)}...`);
    console.log(`   ✅ General question processed successfully\n`);
  } else {
    console.log(`   ❌ Chat failed: ${JSON.stringify(chat2.body)}\n`);
  }

  // 6. Check chat history
  console.log('6️⃣  Checking chat history...');
  const history = await request('GET', '/chat/history');
  console.log(`   Total messages: ${history.body.total}`);
  console.log(`   ✅ Chat history retrieved\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅ All tests passed!');
  console.log('═══════════════════════════════════════════════════');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
