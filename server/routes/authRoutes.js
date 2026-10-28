// server/routes/authRoutes.js — Authentication routes definition
'use strict';

const express = require('express');
const router = express.Router();
const {
  uploadProfilePhoto: multerProfilePhotoUpload,
} = require('../middleware/profileUpload');
const {
  register,
  login,
  getProfile,
  updateProfile,
  getProfilePhoto,
  updateProfilePhoto,
  deleteProfilePhoto,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public auth endpoints with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected user profile details (Read, Update)
router.get('/me', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);
router.put('/profile', requireAuth, updateProfile);

// Multer upload middleware wrapper for consistent error responses
const handleMulterUpload = (req, res, next) => {
  multerProfilePhotoUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof require('multer').MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';

      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? 'Profile photo must be 2 MB or smaller.'
          : 'Invalid file upload.',
      });
    }

    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Could not upload profile photo.',
    });
  });
};

// Full Profile Photo CRUD:
// 1. READ: GET /api/auth/profile-photo
router.get('/profile-photo', requireAuth, getProfilePhoto);

// 2. CREATE: POST /api/auth/profile-photo
router.post('/profile-photo', requireAuth, handleMulterUpload, updateProfilePhoto);

// 3. UPDATE: PUT /api/auth/profile-photo
router.put('/profile-photo', requireAuth, handleMulterUpload, updateProfilePhoto);

// 4. DELETE: DELETE /api/auth/profile-photo
router.delete('/profile-photo', requireAuth, deleteProfilePhoto);

module.exports = router;
