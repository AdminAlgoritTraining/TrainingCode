const express = require('express');
const { register, login, getMe, refreshToken, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { getAdminStats } = require('../controllers/admin');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/refresh-token', protect, refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/admin/stats', protect, adminOnly, getAdminStats);

module.exports = router;