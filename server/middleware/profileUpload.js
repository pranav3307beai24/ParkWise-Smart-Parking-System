
'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'frontend', 'uploads', 'profiles');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${extension}`;
    cb(null, filename);
  },
});

const allowedTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const uploadProfilePhoto = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('Only JPG, PNG, and WebP images are allowed.');
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  },
}).single('profilePhoto');

module.exports = { uploadProfilePhoto };
