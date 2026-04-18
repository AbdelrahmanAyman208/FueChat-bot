const db = require('../config/db');
const { AI_ENABLED, getAIResponse } = require('./aiService');

/**
 * Loads a complete snapshot of the student's academic profile.
 * Called once per message — gives the bot full context.
 */
async function loadStudentContext(studentId) {
  const profileResult = await db.query(
    `SELECT s.student_id, s.first_name, s.last_name, s.email, s.gpa, s.major,
            dr.description  AS degree_description,
            dr.credits_needed,
            dr.effective_date
     FROM student s
     LEFT JOIN degree_requirement dr ON dr.req_id = s.req_id
     WHERE s.student_id = $1`,
    [studentId]
  );
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const coursesResult = await db.query(
    `SELECT c.course_id, c.code, c.name, c.credits, c.instructor, c.semester, sc.status
     FROM student_course sc
     JOIN course c ON c.course_id = sc.course_id
     WHERE sc.student_id = $1
     ORDER BY sc.status, c.code`,
    [studentId]
  );
  const allCourses = coursesResult.rows;

  const completed   = allCourses.filter(c => c.status === 'completed');
  const inProgress  = allCourses.filter(c => c.status === 'in_progress');
  const planned     = allCourses.filter(c => c.status === 'planned');
  const failed      = allCourses.filter(c => c.status === 'failed');
  const creditsEarned = completed.reduce((sum, c) => sum + c.credits, 0);

  return {
    id:                profile.student_id,
    firstName:         profile.first_name,
    lastName:          profile.last_name,
    fullName:          `${profile.first_name} ${profile.last_name}`,
    email:             profile.email,
    gpa:               profile.gpa,
    major:             profile.major,
    degreeDescription: profile.degree_description,
    creditsNeeded:     profile.credits_needed,
    creditsEarned,
    creditsRemaining:  (profile.credits_needed || 0) - creditsEarned,
    progressPct:       profile.credits_needed
                         ? Math.round((creditsEarned / profile.credits_needed) * 100)
                         : 0,
    completed,
    inProgress,
    planned,
    failed,
    allCourses,
  };
}

/**
 * Main bot engine — receives full student context and the message.
 * STRATEGY: Try the Python AI service first for intelligent RAG-powered
 * responses. If the AI is unavailable, fall back to keyword-based responses.
 */
async function buildBotResponse(message, studentId) {
  const ctx = await loadStudentContext(studentId);

  if (!ctx) {
    return "Sorry, I couldn't load your student profile. Please try logging in again.";
  }

  // ── Try AI-powered response first ──────────────────────────
  if (AI_ENABLED) {
    try {
      const aiAnswer = await getAIResponse(message, ctx);
      if (aiAnswer) {
        console.log(`[AI] Successfully got AI response for student ${studentId}`);
        return aiAnswer;
      }
    } catch (error) {
      // AI unavailable — fall through to keyword-based fallback
      console.warn(
        `[AI] AI service error (falling back to keyword bot): ${error.message}`
      );
    }
  }

  // ── Fallback: keyword-based responses ──────────────────────
  return buildKeywordResponse(ctx, message);
}

/**
 * Original keyword-matching bot logic — used as fallback when the AI
 * service is unavailable.
 */
async function buildKeywordResponse(ctx, message) {
  const msg = message.toLowerCase().trim();

  if (msg.match(/^(hi|hello|hey|good morning|good afternoon|salaam|marhaba|ahlan)/)) {
    return buildGreeting(ctx);
  }

  if (msg.includes('my profile') || msg.includes('my info') || msg.includes('who am i') || msg.includes('about me')) {
    return buildProfileSummary(ctx);
  }

  if (msg.includes('gpa') || msg.includes('grade point') || msg.includes('my grade')) {
    return buildGPASummary(ctx);
  }

  if (msg.includes('graduation') || msg.includes('degree') || msg.includes('requirement') || msg.includes('credits') || msg.includes('progress')) {
    return buildDegreeSummary(ctx);
  }

  if (msg.includes('completed') || msg.includes('finished') || msg.includes('passed') || msg.includes('courses i took')) {
    return buildCompletedCourses(ctx);
  }

  if (msg.includes('in progress') || msg.includes('current courses') || msg.includes('taking now') || msg.includes('enrolled')) {
    return buildInProgressCourses(ctx);
  }

  if (msg.includes('planned') || msg.includes('upcoming') || msg.includes('future courses')) {
    return buildPlannedCourses(ctx);
  }

  if ((msg.includes('table') && msg.includes('schedule')) || (msg.includes('table') && msg.includes('summer'))) {
    return await buildScheduleTable(ctx);
  }

  if (msg.includes('all my courses') || msg.includes('show all') || msg.includes('my schedule')) {
    return buildAllCourses(ctx);
  }

  if (msg.includes('prerequisite') || msg.includes('prereq') || msg.includes('required for') || msg.includes('before taking')) {
    const code = extractCourseCode(message);
    if (code) return await getPrerequisites(code, ctx);
    return `Sure ${ctx.firstName}, which course do you want to know prerequisites for? (e.g. "prerequisites for CS201")`;
  }

  if (msg.includes('can i take') || msg.includes('am i eligible') || msg.includes('allowed to take') || msg.includes('qualify for')) {
    const code = extractCourseCode(message);
    if (code) return await checkEligibility(code, ctx);
    return `Which course would you like to check, ${ctx.firstName}?`;
  }

  if (msg.includes('next') || msg.includes('what should i take') || msg.includes('recommend') || msg.includes('available courses') || msg.includes('what can i take')) {
    return await getAvailableCourses(ctx);
  }

  if (msg.includes('tell me about') || msg.includes('info about') || msg.includes('describe') || msg.includes('what is ')) {
    const code = extractCourseCode(message);
    if (code) return await getCourseInfo(code, ctx);
  }

  if (msg.includes('missing') || msg.includes('what do i need') || msg.includes('still need')) {
    const code = extractCourseCode(message);
    if (code) return await getMissingPrereqs(code, ctx);
    return `Which course are you asking about, ${ctx.firstName}?`;
  }

  if (msg.includes('help') || msg.includes('what can you do') || msg.includes('commands')) {
    return buildHelp(ctx);
  }

  return `I didn't quite understand that, ${ctx.firstName}. Try asking things like:\n• "What are my completed courses?"\n• "Can I take CS201?"\n• "What should I take next?"\n• "What is my GPA?"\n\nOr type **help** for the full list.`;
}

// ── Response Builders ────────────────────────────────────────────────

function buildGreeting(ctx) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const gpaNote = ctx.gpa
    ? ctx.gpa >= 3.7 ? '🏆 Excellent GPA — keep it up!'
    : ctx.gpa >= 3.0 ? '👍 Good academic standing.'
    : ctx.gpa >= 2.0 ? '📈 Keep pushing to improve your GPA.'
    : '⚠️ Your GPA needs attention — consider speaking to your advisor.'
    : '';

  return `${timeOfDay}, **${ctx.fullName}**! 👋

Here's a quick snapshot of your academic status:
• 🎓 Major: **${ctx.major}**
• 📊 GPA: **${ctx.gpa ?? 'Not recorded'}** ${gpaNote}
• ✅ Credits Earned: **${ctx.creditsEarned}** / ${ctx.creditsNeeded ?? '?'} (${ctx.progressPct}% complete)
• 📖 Courses In Progress: **${ctx.inProgress.length}**

What would you like to know today? Type **help** to see all I can do.`;
}

function buildProfileSummary(ctx) {
  return `👤 **Your Academic Profile**

• **Name:** ${ctx.fullName}
• **Email:** ${ctx.email}
• **Major:** ${ctx.major}
• **GPA:** ${ctx.gpa ?? 'Not recorded'}
• **Degree Plan:** ${ctx.degreeDescription ?? 'Not assigned'}

📊 **Degree Progress**
• Credits Required: ${ctx.creditsNeeded ?? '?'}
• Credits Earned: ${ctx.creditsEarned}
• Credits Remaining: ${ctx.creditsRemaining}
• Progress: ${ctx.progressPct}%

📚 **Courses Summary**
• Completed: ${ctx.completed.length}
• In Progress: ${ctx.inProgress.length}
• Planned: ${ctx.planned.length}`;
}

function buildGPASummary(ctx) {
  if (!ctx.gpa) return `${ctx.firstName}, your GPA hasn't been recorded yet. Please contact the registrar's office.`;
  const standing =
    ctx.gpa >= 3.7 ? "Excellent 🏆 — you're on the Dean's List track!"
    : ctx.gpa >= 3.0 ? 'Good 👍 — solid academic standing.'
    : ctx.gpa >= 2.0 ? 'Satisfactory — there is room to improve.'
    : 'At Risk ⚠️ — please speak with your academic advisor.';

  return `📊 **GPA Report for ${ctx.fullName}**

• Current GPA: **${ctx.gpa}** / 4.00
• Standing: ${standing}
• Major: ${ctx.major}
• Credits Earned: ${ctx.creditsEarned}`;
}

function buildDegreeSummary(ctx) {
  if (!ctx.creditsNeeded) {
    return `${ctx.firstName}, no degree plan has been assigned to your account yet. Please contact the registrar.`;
  }
  const bar = buildProgressBar(ctx.progressPct);
  return `🎓 **Degree Progress — ${ctx.major}**
${ctx.degreeDescription ?? ''}

${bar} ${ctx.progressPct}%

• Credits Required:  ${ctx.creditsNeeded}
• Credits Earned:    ${ctx.creditsEarned}
• Credits Remaining: ${ctx.creditsRemaining}

📚 Courses completed: ${ctx.completed.length}
📖 Courses in progress: ${ctx.inProgress.length}
📅 Courses planned: ${ctx.planned.length}`;
}

function buildCompletedCourses(ctx) {
  if (!ctx.completed.length) {
    return `${ctx.firstName}, you haven't completed any courses yet. Let's get started! 💪`;
  }
  const list = ctx.completed.map(c => `  ✅ ${c.code} — ${c.name} (${c.credits} cr)`).join('\n');
  return `✅ **Completed Courses — ${ctx.fullName}**
Total: ${ctx.completed.length} courses | ${ctx.creditsEarned} credits\n\n${list}`;
}

function buildInProgressCourses(ctx) {
  if (!ctx.inProgress.length) {
    return `${ctx.firstName}, you have no courses currently in progress.`;
  }
  const list = ctx.inProgress.map(c =>
    `  📖 ${c.code} — ${c.name} (${c.credits} cr) | ${c.instructor ?? 'TBA'} | ${c.semester ?? 'TBA'}`
  ).join('\n');
  return `📖 **Courses In Progress — ${ctx.fullName}**\n\n${list}`;
}

function buildPlannedCourses(ctx) {
  if (!ctx.planned.length) {
    return `${ctx.firstName}, you have no planned courses yet. Want me to recommend what to take next?`;
  }
  const list = ctx.planned.map(c => `  📅 ${c.code} — ${c.name} (${c.credits} cr)`).join('\n');
  return `📅 **Planned Courses — ${ctx.fullName}**\n\n${list}`;
}

function buildAllCourses(ctx) {
  const sections = [];
  if (ctx.completed.length)
    sections.push(`✅ **Completed (${ctx.completed.length})**\n` + ctx.completed.map(c => `  • ${c.code} — ${c.name}`).join('\n'));
  if (ctx.inProgress.length)
    sections.push(`📖 **In Progress (${ctx.inProgress.length})**\n` + ctx.inProgress.map(c => `  • ${c.code} — ${c.name}`).join('\n'));
  if (ctx.planned.length)
    sections.push(`📅 **Planned (${ctx.planned.length})**\n` + ctx.planned.map(c => `  • ${c.code} — ${c.name}`).join('\n'));
  if (!sections.length) return `${ctx.firstName}, you have no courses recorded yet.`;
  return `📚 **All Courses — ${ctx.fullName}**\n\n${sections.join('\n\n')}`;
}

function buildHelp(ctx) {
  return `Hi ${ctx.firstName}! Here's everything I can help you with:

👤 **Your Profile**
  • "My profile" / "My info"
  • "What is my GPA?"
  • "Show my degree progress" / "How many credits do I have?"

📚 **Your Courses**
  • "What are my completed courses?"
  • "What courses am I taking?" (in progress)
  • "Show all my courses"
  • "What are my planned courses?"

🔍 **Course Eligibility**
  • "Can I take CS201?"
  • "Am I eligible for MATH102?"
  • "What are the prerequisites for CS201?"
  • "What am I missing to take CS201?"

🎯 **Recommendations**
  • "What courses can I take next?"
  • "What should I take next semester?"

📘 **Course Info**
  • "Tell me about CS101"
  • "Describe MATH102"`;
}

// ── DB Query Helpers ─────────────────────────────────────────────────

async function getPrerequisites(courseCode, ctx) {
  const prereqs = await db.query(
    `SELECT prereq.code, prereq.name,
            (sc.course_id IS NOT NULL) AS completed
     FROM course_prerequisite cp
     JOIN course target ON target.course_id = cp.course_id
     JOIN course prereq ON prereq.course_id = cp.prereq_course_id
     LEFT JOIN student_course sc
       ON sc.course_id = prereq.course_id
      AND sc.student_id = $2
      AND sc.status = 'completed'
     WHERE UPPER(target.code) = $1`,
    [courseCode, ctx.id]
  );
  if (!prereqs.rows.length) {
    return `**${courseCode}** has no prerequisites — ${ctx.firstName}, you can enroll freely! ✅`;
  }
  const list = prereqs.rows.map(r => `  ${r.completed ? '✅' : '❌'} ${r.code} — ${r.name}`).join('\n');
  const allDone = prereqs.rows.every(r => r.completed);
  const summary = allDone
    ? `\n\n✅ ${ctx.firstName}, you've completed all prerequisites and are eligible to enroll!`
    : `\n\n❌ ${ctx.firstName}, you still have incomplete prerequisites.`;
  return `📋 **Prerequisites for ${courseCode}**\n\n${list}${summary}`;
}

async function checkEligibility(courseCode, ctx) {
  const course = await db.query('SELECT course_id, name FROM course WHERE UPPER(code) = $1', [courseCode]);
  if (!course.rows.length) {
    return `${ctx.firstName}, I couldn't find a course with the code **${courseCode}**. Please double-check the code.`;
  }
  const { course_id, name } = course.rows[0];

  const enrolled = ctx.allCourses.find(c => c.course_id === course_id);
  if (enrolled) {
    const emoji = enrolled.status === 'completed' ? '✅' : enrolled.status === 'in_progress' ? '📖' : '📅';
    return `${emoji} ${ctx.firstName}, you already have **${courseCode} — ${name}** with status: **${enrolled.status}**.`;
  }

  const missing = await db.query(
    `SELECT prereq.code, prereq.name
     FROM course_prerequisite cp
     JOIN course prereq ON prereq.course_id = cp.prereq_course_id
     LEFT JOIN student_course sc
       ON sc.course_id = prereq.course_id
      AND sc.student_id = $2
      AND sc.status = 'completed'
     WHERE cp.course_id = $1 AND sc.course_id IS NULL`,
    [course_id, ctx.id]
  );

  if (!missing.rows.length) {
    return `✅ Yes, **${ctx.firstName}**! You are eligible to take **${courseCode} — ${name}**.\nAll prerequisites are satisfied. You can enroll now!`;
  }
  const list = missing.rows.map(r => `  ❌ ${r.code} — ${r.name}`).join('\n');
  return `❌ **${ctx.firstName}**, you cannot take **${courseCode} — ${name}** yet.\n\nYou still need to complete:\n${list}`;
}

async function getMissingPrereqs(courseCode, ctx) {
  const course = await db.query('SELECT course_id, name FROM course WHERE UPPER(code) = $1', [courseCode]);
  if (!course.rows.length) return `I couldn't find course **${courseCode}**, ${ctx.firstName}.`;

  const missing = await db.query(
    `SELECT prereq.code, prereq.name
     FROM course_prerequisite cp
     JOIN course prereq ON prereq.course_id = cp.prereq_course_id
     LEFT JOIN student_course sc
       ON sc.course_id = prereq.course_id
      AND sc.student_id = $2
      AND sc.status = 'completed'
     WHERE cp.course_id = $1 AND sc.course_id IS NULL`,
    [course.rows[0].course_id, ctx.id]
  );

  if (!missing.rows.length) {
    return `Great news, ${ctx.firstName}! You have no missing prerequisites for **${courseCode}** — you're eligible to enroll! ✅`;
  }
  const list = missing.rows.map(r => `  ❌ ${r.code} — ${r.name}`).join('\n');
  return `📋 **Missing Prerequisites for ${courseCode}** — ${ctx.firstName}:\n\n${list}`;
}

async function getAvailableCourses(ctx) {
  const result = await db.query(
    `SELECT c.code, c.name, c.credits, c.semester
     FROM course c
     WHERE NOT EXISTS (
       SELECT 1 FROM course_prerequisite cp
       LEFT JOIN student_course sc
         ON sc.course_id = cp.prereq_course_id
        AND sc.student_id = $1
        AND sc.status = 'completed'
       WHERE cp.course_id = c.course_id AND sc.course_id IS NULL
     )
     AND NOT EXISTS (
       SELECT 1 FROM student_course sc2
       WHERE sc2.course_id = c.course_id AND sc2.student_id = $1
     )
     ORDER BY c.code`,
    [ctx.id]
  );

  if (!result.rows.length) {
    return `🎉 ${ctx.firstName}, you're enrolled in all available courses or there are no new ones to suggest right now!`;
  }
  const list = result.rows.map(c =>
    `  🎯 ${c.code} — ${c.name} (${c.credits} cr) | ${c.semester ?? 'TBA'}`
  ).join('\n');
  return `🎯 **Courses ${ctx.firstName} Can Take Next** (${result.rows.length} available):\n\n${list}\n\nAll prerequisites for these courses are satisfied!`;
}

async function getCourseInfo(courseCode, ctx) {
  const result = await db.query(
    'SELECT code, name, description, credits, instructor, semester FROM course WHERE UPPER(code) = $1',
    [courseCode]
  );
  if (!result.rows.length) return `${ctx.firstName}, I couldn't find a course with the code **${courseCode}**.`;
  const c = result.rows[0];
  const inRecord = ctx.allCourses.find(r => r.code.toUpperCase() === courseCode);
  const statusLine = inRecord
    ? `\n• Your Status: **${inRecord.status}** ${inRecord.status === 'completed' ? '✅' : '📖'}`
    : '';
  return `📘 **${c.code} — ${c.name}**\n${c.description ?? 'No description available.'}\n\n• Credits: ${c.credits}\n• Instructor: ${c.instructor ?? 'TBA'}\n• Semester: ${c.semester ?? 'TBA'}${statusLine}`;
}

// ── Utilities ─────────────────────────────────────────────────────────

function extractCourseCode(message) {
  const match = message.match(/\b([A-Za-z]{2,6}\s?\d{2,4})\b/);
  return match ? match[1].replace(/\s/g, '').toUpperCase() : null;
}

function buildProgressBar(pct) {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

async function buildScheduleTable(ctx) {
  const result = await db.query(
    `SELECT c.code, c.name, c.credits, c.semester
     FROM course c
     WHERE NOT EXISTS (
       SELECT 1 FROM course_prerequisite cp
       LEFT JOIN student_course sc
         ON sc.course_id = cp.prereq_course_id
        AND sc.student_id = $1
        AND sc.status = 'completed'
       WHERE cp.course_id = c.course_id AND sc.course_id IS NULL
     )
     AND NOT EXISTS (
       SELECT 1 FROM student_course sc2
       WHERE sc2.course_id = c.course_id AND sc2.student_id = $1
     )
     ORDER BY c.code LIMIT 6`,
    [ctx.id]
  );

  if (!result.rows.length) {
    return `🎉 ${ctx.firstName}, you're enrolled in all available courses or there are no new ones to suggest right now!`;
  }
  
  const mockDays = [
     { day: 'Saturday', date: '07/03/2026' },
     { day: 'Sunday', date: '08/03/2026' },
     { day: 'Monday', date: '09/03/2026' },
  ];
  const mockTimes = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00'];
  const mockRooms = ['B4.3', 'B2.2', 'I3', 'B4', 'B4.8'];
  const mockTypes = ['Theoretical', 'Practical'];
  const mockInstructors = ['Assoc. Prof./Dieaa Ibrahim', 'L/Heba Hamdy', 'TA/Nesma Tamer', 'AL/Nada Emad'];

  let md = `Here is your detailed weekly schedule for the upcoming semester:\n\n`;

  let totalCredits = 0;
  
  let courseIdx = 0;
  for (let d = 0; d < mockDays.length; d++) {
     if (courseIdx >= result.rows.length) break;
     
     md += `**Day: ${mockDays[d].day} ${mockDays[d].date}**\n\n`;
     md += `| Time | Course | Type | Room | Instructor |\n`;
     md += `|---|---|---|---|---|\n`;

     let coursesToday = 0;
     while (coursesToday < 2 && courseIdx < result.rows.length) {
         let c = result.rows[courseIdx];
         if (totalCredits + c.credits > 18) {
             courseIdx++;
             continue; 
         }
         
         let time = mockTimes[coursesToday % mockTimes.length];
         let type = mockTypes[courseIdx % mockTypes.length];
         let room = mockRooms[courseIdx % mockRooms.length];
         let inst = mockInstructors[courseIdx % mockInstructors.length];
         
         md += `| ${time} | **${c.name}** - ${c.code} | ${type} | ${room} | ${inst} |\n`;
         
         totalCredits += c.credits;
         courseIdx++;
         coursesToday++;
     }
     md += `\n`;
  }
  
  md += `**Total Credits Recommended:** ${totalCredits} \n\n*Note: This is a system-generated fallback table displaying mock timetable details for demonstration purposes.*`;
  return md;
}

module.exports = { buildBotResponse };
