const db = require('../config/db');
const { buildBotResponseStream, buildBotResponse, loadStudentContext } = require('../services/botService');
const { checkAIHealth, mapStudentContextToProfile } = require('../services/aiService');
const axios = require('axios');
const FormData = require('form-data');

// POST /chat/message
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const studentId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const finalSessionId = sessionId || `session-${Date.now()}-${studentId}`;

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // First chunk immediately gives frontend the new sessionId
    res.write(`data: [SESSION_ID] ${finalSessionId}\n\n`);

    // buildBotResponseStream handles the exact res.write() logic natively
    const botResponse = await buildBotResponseStream(message.trim(), studentId, finalSessionId, res);

    // After the stream is finished running completely, save it to PostgreSQL.
    const result = await db.query(
      `INSERT INTO chat_history (student_id, user_message, bot_response, session_id, session_status)
       VALUES ($1, $2, $3, $4, 'open') RETURNING chat_id, timestamp`,
      [studentId, message.trim(), botResponse, finalSessionId]
    );

    const chatId = result.rows[0].chat_id;
    // Tell frontend the stream is absolutely completed
    res.write(`data: [DONE] ${chatId}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: [ERROR] Internal server error\n\n`);
    res.end();
  }
};

// POST /chat/upload-message
exports.sendMessageWithFile = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const studentId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const finalSessionId = sessionId || `session-${Date.now()}-${studentId}`;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: [SESSION_ID] ${finalSessionId}\n\n`);

    const ctx = await loadStudentContext(studentId);
    if (!ctx) {
      const errorMsg = "Sorry, I couldn't load your student profile.";
      res.write(`data: ${errorMsg}\n\n`);
      res.write(`data: [DONE] 0\n\n`);
      return res.end();
    }

    const profile = mapStudentContextToProfile(ctx);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('session_id', finalSessionId);
    formData.append('message', message || '');
    formData.append('student_profile', JSON.stringify(profile));
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      const response = await axios.post(`${AI_BASE_URL}/api/v1/chat/upload`, formData, {
        headers: { ...formData.getHeaders() },
        responseType: 'stream',
        timeout: 90000,
      });

      let fullAnswer = '';

      response.data.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[ERROR]')) {
            fullAnswer += line.substring(6);
          }
        }
        res.write(chunk);
      });

      response.data.on('end', async () => {
        // Save to DB
        try {
          const userMessageStr = message ? `[Attached File: ${file.originalname}]\n${message}` : `[Attached File: ${file.originalname}]`;
          const result = await db.query(
            `INSERT INTO chat_history (student_id, user_message, bot_response, session_id, session_status)
             VALUES ($1, $2, $3, $4, 'open') RETURNING chat_id, timestamp`,
            [studentId, userMessageStr, fullAnswer, finalSessionId]
          );
          const chatId = result.rows[0].chat_id;
          res.write(`data: [DONE] ${chatId}\n\n`);
        } catch (dbErr) {
          console.error('Save to db error:', dbErr);
          res.write(`data: [DONE] 0\n\n`);
        }
        res.end();
      });

      response.data.on('error', (err) => {
        console.error('Upload stream error:', err);
        res.write(`data: [ERROR] ${err.message}\n\n`);
        res.end();
      });

    } catch (aiError) {
      console.error('AI service upload error:', aiError.message);
      res.write(`data: [ERROR] AI service unavailable or failed to process file.\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Upload error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    } else {
      res.write(`data: [ERROR] Internal server error\n\n`);
      res.end();
    }
  }
};

// GET /chat/welcome  — called right after login to get a personalised greeting
exports.getWelcome = async (req, res) => {
  try {
    const studentId = req.user.id;
    const botResponse = await buildBotResponse('hello', studentId);
    res.json({ botResponse });
  } catch (error) {
    console.error('Welcome error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /chat/history
exports.getChatHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const sessionId = req.query.sessionId;
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;

    let queryStr = `SELECT chat_id, user_message, bot_response, session_status, timestamp FROM chat_history WHERE student_id = $1`;
    let countQueryStr = 'SELECT COUNT(*) FROM chat_history WHERE student_id = $1';
    let queryArgs = [studentId];

    if (sessionId) {
      queryStr += ` AND session_id = $2`;
      countQueryStr += ` AND session_id = $2`;
      queryArgs.push(sessionId);
    }

    queryStr += ` ORDER BY timestamp DESC LIMIT $${queryArgs.length + 1} OFFSET $${queryArgs.length + 2}`;

    const result = await db.query(queryStr, [...queryArgs, limit, offset]);
    const countResult = await db.query(countQueryStr, queryArgs);

    res.json({
      history: result.rows.reverse(),
      total:   parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /chat/sessions
exports.getSessions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const result = await db.query(`
      SELECT 
        session_id as "sessionId",
        MIN(timestamp) as "startedAt",
        MAX(timestamp) as "lastActivity",
        (SELECT user_message FROM chat_history ch2 WHERE ch2.session_id = ch1.session_id ORDER BY timestamp ASC LIMIT 1) as "firstMessage"
      FROM chat_history ch1
      WHERE student_id = $1 AND session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY MAX(timestamp) DESC
    `, [studentId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /chat/session/:sessionId
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await db.query('DELETE FROM chat_history WHERE student_id = $1 AND session_id = $2', [req.user.id, sessionId]);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /chat/history
exports.clearHistory = async (req, res) => {
  try {
    await db.query('DELETE FROM chat_history WHERE student_id = $1', [req.user.id]);
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /chat/ai-status — check if the Python AI service is online
exports.getAIStatus = async (req, res) => {
  try {
    const status = await checkAIHealth();
    res.json(status);
  } catch (error) {
    console.error('AI status check error:', error);
    res.json({ available: false, reason: error.message });
  }
};

// POST /chat/program-finder — AI-powered program recommendation quiz
exports.programFinder = async (req, res) => {
  try {
    const { answers } = req.body;
    const studentId = req.user.id;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Quiz answers are required' });
    }

    const questions = [
      'What excites you most about technology?',
      'Which school subject did you enjoy most?',
      'What kind of problems do you enjoy solving?',
      'Where do you see yourself in 5 years?',
      'Which activity sounds most appealing?',
      'How do you feel about math and statistics?',
      'What matters most to you in a career?',
    ];

    let answersText = '';
    answers.forEach((answer, i) => {
      answersText += `Q${i + 1}: ${questions[i] || `Question ${i + 1}`}\nAnswer: ${answer}\n\n`;
    });

    const prompt = `You are an academic program advisor for the Faculty of Computers and Information Technology at Future University in Egypt.

A freshman/sophomore student has just completed a career interest quiz. Based on their answers below, recommend the SINGLE BEST program for them from these 5 options:

1. **Computer Science (CS)** — Software engineering, algorithms, systems programming, web/mobile development
2. **Artificial Intelligence (AI)** — Machine learning, deep learning, NLP, computer vision, robotics
3. **Cybersecurity (CY)** — Network security, ethical hacking, digital forensics, cryptography
4. **Information Systems (IS)** — Business analysis, database management, ERP systems, IT management
5. **Data Science (DS)** — Data analysis, statistics, data visualization, big data, business intelligence

## Student's Quiz Answers:
${answersText}

## Your Response Format:
1. Start with a clear heading: "🎯 Recommended Program: [Program Name]"
2. Explain WHY this program is the best fit (1-2 very brief sentences referencing specific answers)
3. List "📚 Key Courses You'll Take:" (3 specific courses)
4. List "💼 Career Opportunities:" (3 specific roles)
5. Add a "✨ Why This Fits You:" section (1 brief concluding sentence)

Be extremely concise, brief, and specific. Do not add fluff. Use markdown formatting with bold, headers, and bullet points.`;

    const sessionId = `program-finder-${Date.now()}-${studentId}`;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Call Python AI service
    const axios = require('axios');
    const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      const response = await axios.post(`${AI_BASE_URL}/api/v1/chat`, {
        session_id: sessionId,
        message: prompt,
      }, {
        responseType: 'stream',
        timeout: 90000,
      });

      let fullAnswer = '';

      response.data.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[ERROR]')) {
            fullAnswer += line.substring(6);
          }
        }
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      });

      response.data.on('error', (err) => {
        console.error('Program finder stream error:', err);
        res.write(`data: [ERROR] ${err.message}\n\n`);
        res.end();
      });
    } catch (aiError) {
      console.error('AI service error:', aiError.message);
      res.write(`data: [ERROR] AI service unavailable. Please try again later.\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Program finder error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    } else {
      res.write(`data: [ERROR] Internal server error\n\n`);
      res.end();
    }
  }
};
