const db = require('../config/db');
const { buildBotResponse } = require('../services/botService');
const { checkAIHealth } = require('../services/aiService');

// POST /chat/message
exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const studentId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // buildBotResponse loads full student context internally
    const botResponse = await buildBotResponse(message.trim(), studentId);

    const finalSessionId = sessionId || `session-${Date.now()}-${studentId}`;

    const result = await db.query(
      `INSERT INTO chat_history (student_id, user_message, bot_response, session_id, session_status)
       VALUES ($1, $2, $3, $4, 'open') RETURNING chat_id, timestamp`,
      [studentId, message.trim(), botResponse, finalSessionId]
    );

    const chatId = result.rows[0].chat_id;
    const timestamp = result.rows[0].timestamp;

    // Return in the format the React frontend expects
    res.status(201).json({
      sessionId:   finalSessionId,
      message: {
        id:        `msg-${chatId}`,
        role:      'assistant',
        content:   botResponse,
        timestamp: timestamp,
        status:    'complete',
      },
      // Also include legacy fields for backward compat
      chatId,
      userMessage: message.trim(),
      botResponse,
      timestamp,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
