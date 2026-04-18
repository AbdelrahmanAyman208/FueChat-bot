/**
 * Full test script for FueBot — tests both student and advisor flows.
 * Assumes the database was seeded with db/FueBot.sql
 *
 * Seed credentials:
 *   Students → password: student123
 *   Advisors → password: advisor123
 *
 * Run: node test_advisor.js
 */
const http = require('http');

let sessionCookie = '';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          sessionCookie = setCookie[0].split(';')[0];
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function log(label, result) {
  const icon = result.status >= 200 && result.status < 300 ? '✅' : result.status === 401 || result.status === 403 ? '🔒' : '❌';
  console.log(`${icon} [${result.status}] ${label}`);
  console.log(JSON.stringify(result.body, null, 2));
  console.log('');
}

async function run() {
  let passed = 0;
  let failed = 0;

  function check(label, result, expectedStatus) {
    if (result.status === expectedStatus) {
      passed++;
    } else {
      failed++;
      console.log(`  ⚠️  EXPECTED ${expectedStatus}, GOT ${result.status}`);
    }
    log(label, result);
  }

  console.log('════════════════════════════════════════════');
  console.log('  FueBot API Test Suite');
  console.log('════════════════════════════════════════════\n');

  // ── STUDENT FLOW ────────────────────────────────────────
  console.log('─── STUDENT TESTS ───────────────────────\n');

  const r1 = await request('POST', '/auth/login', { email: 'hassan@example.com', password: 'student123' });
  check('Student login (Hassan)', r1, 200);

  const r2 = await request('GET', '/auth/me');
  check('GET /auth/me (student role)', r2, 200);

  const r3 = await request('GET', '/student/profile');
  check('GET /student/profile', r3, 200);

  const r4 = await request('GET', '/courses/student/enrolled');
  check('GET /courses/student/enrolled', r4, 200);

  // Student should NOT access advisor routes
  const r5 = await request('GET', '/advisor/profile');
  check('Student blocked from /advisor/profile', r5, 403);

  // Logout student
  const r6 = await request('POST', '/auth/logout');
  check('Student logout', r6, 200);
  sessionCookie = '';

  // ── ADVISOR FLOW ────────────────────────────────────────
  console.log('─── ADVISOR TESTS ──────────────────────\n');

  const r7 = await request('POST', '/auth/login', { email: 'ahmed.advisor@fue.edu.eg', password: 'advisor123' });
  check('Advisor login (Dr. Ahmed)', r7, 200);

  const r8 = await request('GET', '/auth/me');
  check('GET /auth/me (advisor role)', r8, 200);

  const r9 = await request('GET', '/advisor/profile');
  check('GET /advisor/profile', r9, 200);

  const r10 = await request('GET', '/advisor/students/all');
  check('GET /advisor/students/all', r10, 200);

  const r11 = await request('GET', '/advisor/students');
  check('GET /advisor/students (assigned)', r11, 200);

  const r12 = await request('GET', '/advisor/students/1');
  check('GET /advisor/students/1 (Hassan details)', r12, 200);

  const r13 = await request('PATCH', '/advisor/students/1/course/CS102', { status: 'completed' });
  check('Update Hassan CS102 → completed', r13, 200);

  const r14 = await request('POST', '/advisor/students/1/enroll', { courseCode: 'CS201', status: 'planned' });
  check('Enroll Hassan in CS201', r14, 201);

  const r15 = await request('PATCH', '/advisor/students/1/profile', { gpa: 3.60 });
  check('Update Hassan GPA → 3.60', r15, 200);

  // Advisor should NOT access student-only routes
  const r16 = await request('GET', '/student/profile');
  check('Advisor blocked from /student/profile', r16, 403);

  // Logout advisor
  await request('POST', '/auth/logout');
  sessionCookie = '';

  // ── SECURITY TESTS ──────────────────────────────────────
  console.log('─── SECURITY TESTS ─────────────────────\n');

  const r17 = await request('GET', '/advisor/profile');
  check('Unauthenticated → /advisor/profile blocked', r17, 401);

  const r18 = await request('GET', '/student/profile');
  check('Unauthenticated → /student/profile blocked', r18, 401);

  const r19 = await request('POST', '/auth/login', { email: 'hassan@example.com', password: 'wrongpassword' });
  check('Wrong password rejected', r19, 401);

  const r20 = await request('POST', '/auth/login', { email: 'nobody@example.com', password: 'student123' });
  check('Non-existent email rejected', r20, 401);

  // ── SUMMARY ─────────────────────────────────────────────
  console.log('════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(console.error);
