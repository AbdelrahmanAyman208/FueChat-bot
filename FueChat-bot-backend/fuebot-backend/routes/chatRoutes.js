const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatController = require('../controllers/chatController');
const requireAuth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

// Configure multer for memory storage (we will forward the buffer to Python)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Only allow specific types
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/markdown', 'text/plain'];
    const allowedExtensions = /\.(pdf|png|jpe?g|md|txt)$/i;
    
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(allowedExtensions)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, JPG, and Markdown are allowed.'));
    }
  }
});

router.use(requireAuth);
router.use(requireRole('student'));

router.get('/welcome', chatController.getWelcome);      // GET after login → personalised greeting
router.post('/message', chatController.sendMessage);    // POST a message → bot response
router.post('/upload-message', upload.single('file'), chatController.sendMessageWithFile); // POST message with file
router.get('/sessions', chatController.getSessions);    // GET distinct sessions/conversations
router.get('/history', chatController.getChatHistory);  // GET conversation history
router.delete('/session/:sessionId', chatController.deleteSession); // DELETE a specific session
router.delete('/history', chatController.clearHistory); // DELETE all history
router.get('/ai-status', chatController.getAIStatus);   // GET AI service health status
router.post('/program-finder', chatController.programFinder); // POST program recommendation quiz

module.exports = router;
