const express = require('express');
const router = express.Router();
const advisorController = require('../controllers/advisorController');
const requireAuth = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');

// All advisor routes require login + advisor role
router.use(requireAuth);
router.use(requireRole('advisor'));

// Advisor profile
router.get('/profile', advisorController.getProfile);

// View all students (for assigning)
router.get('/students/all', advisorController.getAllStudents);

// View assigned students
router.get('/students', advisorController.getAssignedStudents);

// Search global students (must be before :studentId so 'search' isn't parsed as an ID)
router.get('/students/search', advisorController.searchStudents);

// View specific student details
router.get('/students/:studentId', advisorController.getStudentDetails);

// Assign a student to this advisor
router.post('/students/:studentId/assign', advisorController.assignStudent);

// Update student profile (GPA, major)
router.patch('/students/:studentId/profile', advisorController.updateStudentProfile);

// Enroll student in a course
router.post('/students/:studentId/enroll', advisorController.enrollStudentInCourse);

// Update student's course status
router.patch('/students/:studentId/course/:courseCode', advisorController.updateStudentCourseStatus);

module.exports = router;
