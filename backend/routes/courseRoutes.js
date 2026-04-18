const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const requireAuth = require('../middleware/authMiddleware');

router.get('/', courseController.getAllCourses);
router.get('/:code', courseController.getCourseByCode);

// Protected student routes
router.get('/student/enrolled', requireAuth, courseController.getStudentCourses);
router.post('/student/enroll', requireAuth, courseController.enrollCourse);
router.patch('/student/:courseCode/status', requireAuth, courseController.updateCourseStatus);

module.exports = router;
