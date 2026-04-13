const db = require('../config/db');
const { buildBotResponse } = require('../services/botService');
const { checkAIHealth } = require('../services/aiService');

// POST /chat/message
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const studentId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // buildBotResponse loads full student context internally
    const botResponse = await buildBotResponse(message.trim(), studentId);

    const result = await db.query(
      `INSERT INTO chat_history (student_id, user_message, bot_response, session_status)
       VALUES ($1, $2, $3, 'open') RETURNING chat_id, timestamp`,
      [studentId, message.trim(), botResponse]
    );

    res.status(201).json({
      chatId:      result.rows[0].chat_id,
      userMessage: message.trim(),
      botResponse,
      timestamp:   result.rows[0].timestamp,
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
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(
      `SELECT chat_id, user_message, bot_response, session_status, timestamp
       FROM chat_history
       WHERE student_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM chat_history WHERE student_id = $1',
      [studentId]
    );

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
