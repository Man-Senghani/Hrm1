const express = require('express');
const router = express.Router();
const { login, getMe, createUser, updatePassword, uploadProfileImage, forgotPassword, resetPassword, verifyResetToken, updateProfile, cleanStagingData } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/login', login);
router.get('/clean-staging-data', cleanStagingData);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', resetPassword);
router.post('/create-user', protect, createUser);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.post('/profile-image', protect, uploadProfileImage);
router.put('/profile', protect, updateProfile);

module.exports = router;
