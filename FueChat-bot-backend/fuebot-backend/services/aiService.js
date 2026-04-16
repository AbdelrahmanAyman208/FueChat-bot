const axios = require('axios');

// ── Configuration ─────────────────────────────────────────────────
const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT  = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;
const AI_ENABLED  = (process.env.AI_ENABLED || 'true').toLowerCase() === 'true';

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: AI_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

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
async function withRetry(fn, retries = 2, delayMs = 2000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const is524 = error?.response?.status === 500 || error?.response?.data?.detail?.includes?.('524');
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      if ((is524 || isTimeout) && attempt < retries) {
        console.warn(`[AI] Attempt ${attempt + 1} failed (${is524 ? '524 provider timeout' : 'timeout'}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
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
  ];
  return advisingKeywords.some(keyword => msg.includes(keyword));
}

/**
 * High-level function: routes the message to the appropriate AI endpoint.
 * Called from botService.js — returns the AI answer or throws on error.
 */
async function getAIResponse(message, studentContext) {
  const sessionId = `student-${studentContext.id}`;
  const profile   = mapStudentContextToProfile(studentContext);

  if (isAdvisingQuestion(message)) {
    // Use the /advise endpoint for personalised course recommendations
    return await callAIAdvise(sessionId, message, profile);
  } else {
    // Use /chat with profile for general questions with personalisation
    return await callAIChatWithProfile(sessionId, message, profile);
  }
}

module.exports = {
  AI_ENABLED,
  checkAIHealth,
  getAIResponse,
  callAIChat,
  callAIAdvise,
  callAIChatWithProfile,
  mapStudentContextToProfile,
  mapMajorToProgram,
  inferLevel,
  detectSemester,
};
