const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const requireAuth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('student'));

router.get('/profile', studentController.getProfile);
router.patch('/profile', studentController.updateProfile);

module.exports = router;
