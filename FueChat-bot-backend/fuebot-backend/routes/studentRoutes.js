const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const requireAuth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireRole('student'));

// Get student profile
router.get('/profile', studentController.getProfile);

// Update GPA or major
router.patch('/profile', studentController.updateProfile);

// Get schedule view
router.get('/schedule', studentController.getScheduleInfo);

// Submit schedule preference
router.post('/schedule', studentController.submitSchedule);

module.exports = router;
