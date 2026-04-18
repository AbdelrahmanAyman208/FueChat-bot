const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

router.post('/register', validate({
  firstName: { required: true, minLength: 2 },
  lastName: { required: true, minLength: 2 },
  email: { required: true, isEmail: true },
  password: { required: true, minLength: 6 },
  major: { required: true },
}), authController.register);

router.post('/register/advisor', validate({
  firstName: { required: true, minLength: 2 },
  lastName: { required: true, minLength: 2 },
  email: { required: true, isEmail: true },
  password: { required: true, minLength: 6 },
  department: { required: true },
}), authController.registerAdvisor);

router.post('/login', validate({
  email: { required: true, isEmail: true },
  password: { required: true },
}), authController.login);

router.post('/logout', authController.logout);

router.post('/change-password', requireAuth, validate({
  oldPassword: { required: true },
  newPassword: { required: true, minLength: 6 },
}), authController.changePassword);

router.get('/me', requireAuth, authController.me);

router.post('/forgot-password', validate({
  email: { required: true, isEmail: true },
}), authController.forgotPassword);

router.post('/reset-password', validate({
  email: { required: true, isEmail: true },
  code: { required: true },
  newPassword: { required: true, minLength: 6 },
}), authController.resetPassword);

module.exports = router;
