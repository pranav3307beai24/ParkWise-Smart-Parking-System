// server/scripts/lint.js — Check JavaScript syntax across all project files
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const files = [
  'server/app.js',
  'server/server.js',
  'server/config/env.js',
  'server/config/db.js',
  'server/utils/authUtils.js',
  'server/middleware/auth.js',
  'server/middleware/profileUpload.js',
  'server/middleware/rateLimiter.js',
  'server/controllers/authController.js',
  'server/controllers/locationController.js',
  'server/controllers/bookingController.js',
  'server/controllers/vehicleController.js',
  'server/routes/authRoutes.js',
  'server/routes/locationRoutes.js',
  'server/routes/adminRoutes.js',
  'server/routes/bookingRoutes.js',
  'server/routes/vehicleRoutes.js',
  'server/services/bookingService.js',
  'server/scripts/checkDb.js',
  'server/scripts/seedDemo.js',
  'server/scripts/createAdmin.js',
  'server/scripts/lint.js',
  'server/models/User.js',
  'server/models/ParkingLocation.js',
  'server/models/ParkingSlot.js',
  'server/models/Booking.js',
  'server/models/Vehicle.js',
  'server/models/index.js',
  'frontend/js/api.js',
  'frontend/js/storage.js',
  'frontend/js/auth.js',
  'frontend/js/login.js',
  'frontend/js/register.js',
  'frontend/js/dashboard.js',
  'frontend/js/profile.js',
  'frontend/js/booking.js',
  'frontend/js/history.js',
  'frontend/js/locations.js',
  'frontend/js/admin.js',
  'frontend/js/index.js',
];

const rootDir = path.resolve(__dirname, '../..');
let hasError = false;

for (const file of files) {
  const filePath = path.join(rootDir, file);
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  } catch (err) {
    console.error(`Syntax error in ${file}:\n`, err.stderr ? err.stderr.toString() : err.message);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`[PASS] All ${files.length} files passed syntax lint check.`);
