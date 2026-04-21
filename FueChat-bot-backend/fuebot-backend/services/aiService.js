const axios = require('axios');
const redis = require('redis');

// ── Configuration ─────────────────────────────────────────────────
const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT  = parseInt(process.env.AI_SERVICE_TIMEOUT) || 90000;
const AI_ENABLED  = (process.env.AI_ENABLED || 'true').toLowerCase() === 'true';

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: AI_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ── Redis ────────────────────────────────────────────────────────
let redisClient;
try {
  redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.connect().then(() => console.log('✅ Redis connected')).catch(err => console.warn('⚠️ Redis conn error:', err.message));
} catch (e) {
  console.warn('⚠️ Failed to initialize Redis');
}

// ── Major Mapping ─────────────────────────────────────────────────
// Maps DB abbreviations → Python AI's expected program enum values
const MAJOR_MAP = {
  'cs':            'Computer Science',
  'ai':            'Artificial Intelligence',
  'cybersecurity': 'Cybersecurity',
  'cs_sec':        'Cybersecurity',
  'is':            'Information Systems',
  'ds':            'Data Science',
  'dmt':           'Digital Media Technology department',     
};

/**
 * Maps the DB major abbreviation to the Python AI's program enum.
 * Falls back to 'Computer Science' if no match found.
 */
function mapMajorToProgram(major) {
  if (!major) return 'Computer Science';
  const key = major.toLowerCase().trim();
  return MAJOR_MAP[key] || major;  // pass through if already a full name
}

// ── Level Inference ───────────────────────────────────────────────
function inferLevel(creditsEarned) {
  if (creditsEarned <= 30) return 'Freshman';
  if (creditsEarned <= 60) return 'Sophomore';
  if (creditsEarned <= 90) return 'Junior';
  return 'Senior';
}

// ── Semester Detection ────────────────────────────────────────────
/**
 * Derives the current semester from the course.semester field in the DB.
 * The DB stores values like "Fall 2026", "Spring 2027", "Summer 2027".
 * We look at the student's in-progress courses to determine the semester,
 * or fall back to date-based detection.
 */
function detectSemester(inProgressCourses) {
  // Try to extract from in-progress courses
  if (inProgressCourses && inProgressCourses.length > 0) {
    for (const course of inProgressCourses) {
      if (course.semester) {
        const sem = course.semester.toLowerCase();
        if (sem.includes('fall'))   return 'Fall';
        if (sem.includes('spring')) return 'Spring';
        if (sem.includes('summer')) return 'Summer';
      }
    }
  }

  // Fallback: derive from current month
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 9 || month <= 1)  return 'Fall';
  if (month >= 2 && month <= 5)  return 'Spring';
  return 'Summer';
}

// ── Student Context → AI Profile ──────────────────────────────────
/**
 * Transforms the PostgreSQL student context (from loadStudentContext in
 * botService.js) into the Python AI's StudentProfile schema.
 */
function mapStudentContextToProfile(ctx) {
  const program         = mapMajorToProgram(ctx.major);
  const creditsEarned   = ctx.creditsEarned || 0;
  const level           = inferLevel(creditsEarned);
  const currentSemester = detectSemester(ctx.inProgress);

  return {
    student_id:         String(ctx.id),
    name:               ctx.fullName || `${ctx.firstName} ${ctx.lastName}`,
    program:            program,
    level:              level,
    cgpa:               parseFloat(ctx.gpa) || 0.0,
    earned_hours:       creditsEarned,
    current_semester:   currentSemester,
    passed_courses:     (ctx.completed || []).map(c => c.code.toUpperCase()),
    currently_enrolled: (ctx.inProgress || []).map(c => c.code.toUpperCase()),
    failed_courses:     (ctx.failed || []).map(c => c.code.toUpperCase()),
  };
}

// ── AI API Calls ──────────────────────────────────────────────────

/**
 * Checks if the Python AI server is online and the vector store is ready.
 */
async function checkAIHealth() {
  if (!AI_ENABLED) return { available: false, reason: 'AI service disabled' };

  try {
    const response = await aiClient.get('/api/v1/health');
    return {
      available:         true,
      vectorStoreReady:  response.data.vector_store_ready,
      llmProvider:       response.data.llm_provider,
      model:             response.data.model,
    };
  } catch (error) {
    return {
      available: false,
      reason:    error.code === 'ECONNREFUSED'
        ? 'AI server not running'
        : error.message,
    };
  }
}

/**
 * Retry helper — retries an async function up to `retries` times with
 * a delay between attempts. Handles OpenRouter 524 (provider timeout) errors.
 */
async function withRetry(fn, retries = 4, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.response?.status;
      const isProviderError = status === 500 || status === 502 || status === 503 || error?.response?.data?.detail?.includes?.('524');
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      if ((isProviderError || isTimeout) && attempt < retries) {
        console.warn(`[AI] Attempt ${attempt + 1} failed (status=${status || error.code}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Streams the response from the AI service directly to the Express `res` object,
 * and compiles the total string for DB saving.
 */
async function callAIStream(endpoint, payload, res) {
  return withRetry(async () => {
    const response = await aiClient.post(endpoint, payload, { responseType: 'stream' });
    let fullAnswer = "";

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const text = chunk.toString();
        // Parse SSE simply to build the final DB string locally
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[ERROR]')) {
             fullAnswer += line.substring(6);
          }
        }
        // Proxy the exact raw chunk packet to the client
        res.write(chunk);
      });

      response.data.on('end', () => resolve(fullAnswer));
      response.data.on('error', (err) => reject(err));
    });
  });
}

/**
 * Sends a general handbook Q&A question to the Python AI.
 * Uses POST /api/v1/chat — no student profile required.
 */
async function callAIChat(sessionId, message) {
  return withRetry(async () => {
    const response = await aiClient.post('/api/v1/chat', {
      session_id: sessionId,
      message:    message,
    });
    return response.data.answer;
  });
}

/**
 * Sends a personalised advising question to the Python AI.
 * Uses POST /api/v1/advise — requires a full student profile.
 */
async function callAIAdvise(sessionId, message, studentProfile) {
  return withRetry(async () => {
    const response = await aiClient.post('/api/v1/advise', {
      session_id:      sessionId,
      message:         message,
      student_profile: studentProfile,
    });
    return response.data.answer;
  });
}

/**
 * Sends a chat question with a student profile attached.
 * Uses POST /api/v1/chat — the profile personalises the response.
 */
async function callAIChatWithProfile(sessionId, message, studentProfile) {
  return withRetry(async () => {
    const response = await aiClient.post('/api/v1/chat', {
      session_id:      sessionId,
      message:         message,
      student_profile: studentProfile,
    });
    return response.data.answer;
  });
}


// ── Keyword Detection ─────────────────────────────────────────────
/**
 * Determines whether the message is an advising question
 * (needs full student profile + /advise endpoint) or a general Q&A.
 */
function isAdvisingQuestion(message) {
  const msg = message.toLowerCase();
  const advisingKeywords = [
    'recommend', 'what should i take', 'next semester',
    'what can i take', 'available courses', 'suggest',
    'which courses', 'course plan', 'register',
    'eligible', 'can i take', 'advise', 'advice',
    'what do i need', 'what courses', 'my plan',
    'my schedule', 'table', 'next summer'
  ];
  return advisingKeywords.some(keyword => msg.includes(keyword));
}

/**
 * High-level function: routes the message to the appropriate AI endpoint and supports streaming/caching.
 */
async function getAIResponseStream(message, studentContext, providedSessionId, res) {
  const sessionId = providedSessionId || `student-${studentContext.id}`;
  const profile   = mapStudentContextToProfile(studentContext);
  const cacheKey  = `chat:cache:${profile.student_id}:${message.trim().toLowerCase()}`;

  // 1. Check Redis Cache
  if (redisClient && redisClient.isReady) {
    try {
      const cachedResponse = await redisClient.get(cacheKey);
      if (cachedResponse) {
        console.log(`[AI] Cache Hit for student ${studentContext.id}`);
        // Mock streaming the cache to the frontend chunk by chunk
        const chunks = cachedResponse.match(/.{1,10}/g) || [cachedResponse];
        for (const chunk of chunks) {
          res.write(`data: ${chunk}\n\n`);
          await new Promise(r => setTimeout(r, 10)); // simulate stream speed slightly
        }
        return cachedResponse;
      }
    } catch (err) {
      console.warn('redis cache check failed', err);
    }
  }

  // 2. Fetch and Proxy Stream
  let finalAnswer = "";
  if (isAdvisingQuestion(message)) {
    finalAnswer = await callAIStream('/api/v1/advise', { session_id: sessionId, message, student_profile: profile }, res);
  } else {
    finalAnswer = await callAIStream('/api/v1/chat', { session_id: sessionId, message, student_profile: profile }, res);
  }

  // 3. Save to Redis Cache (expire in 2 hours)
  if (redisClient && redisClient.isReady && finalAnswer) {
    redisClient.setEx(cacheKey, 7200, finalAnswer).catch(console.warn);
  }

  return finalAnswer;
}

module.exports = {
  AI_ENABLED,
  checkAIHealth,
  getAIResponseStream,
  mapStudentContextToProfile,
  mapMajorToProgram,
  inferLevel,
  detectSemester,
};
