const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const requireAuth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('student'));

router.get('/welcome', chatController.getWelcome);      // GET after login → personalised greeting
router.post('/message', chatController.sendMessage);    // POST a message → bot response
router.get('/history', chatController.getChatHistory);  // GET conversation history
router.delete('/history', chatController.clearHistory); // DELETE all history
router.get('/ai-status', chatController.getAIStatus);   // GET AI service health status

module.exports = router;
