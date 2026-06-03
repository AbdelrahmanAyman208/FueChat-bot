const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const requireAuth = require('../middleware/authMiddleware');

// Student route to get their own recommendations
router.get('/mine', requireAuth, recommendationController.getRecommendations);

// Advisor routes
router.get('/student/:studentId', requireAuth, recommendationController.getRecommendations);
router.post('/', requireAuth, recommendationController.addRecommendation);
router.put('/:id', requireAuth, recommendationController.updateRecommendation);
router.delete('/:id', requireAuth, recommendationController.deleteRecommendation);

module.exports = router;
