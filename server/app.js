// server/app.js — Express 5 application setup

'use strict';

const path    = require('path');
const express = require('express');
const helmet  = require('helmet');

const app = express();

// ── Security Headers & Content Security Policy ──────────────
// Configured to support the existing vanilla client without disabling security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // Avoid breaking local HTTP during development
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ── Safe Request Logging ────────────────────────────────────
// Formats minimal, non-sensitive request metrics (suppressed in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const sanitizedUrl = req.originalUrl.split('?')[0];
      console.log(`[HTTP] ${req.method} ${sanitizedUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// ── Bounded Body Parsing ────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── Liveness & Readiness Probes ─────────────────────────────
// GET /api/health — Process liveness (returns 200 when running)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const { isConnected, getActiveDatabaseName } = require('./config/db');

// GET /api/ready — Database readiness probe
// Returns 200 when database is connected; otherwise 503 without exposing secrets
app.get('/api/ready', (req, res) => {
  if (isConnected()) {
    return res.status(200).json({
      success: true,
      configured: true,
      connected: true,
      database: getActiveDatabaseName(),
    });
  }

  res.status(503).json({
    success: false,
    configured: true,
    connected: false,
    message: 'Database readiness check failed: database not connected.',
  });
});

// ── Authentication API Routes ───────────────────────────────
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// ── Public Location & Slot Routes ───────────────────────────
const locationRoutes = require('./routes/locationRoutes');
app.use('/api/locations', locationRoutes);

// ── Booking Routes ───────────────────────────────────────────
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// ── Saved Vehicle Routes ─────────────────────────────────────
const vehicleRoutes = require('./routes/vehicleRoutes');
app.use('/api/vehicles', vehicleRoutes);

// ── Admin Routes ─────────────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// ── Static Asset Serving ────────────────────────────────────
// Serves exclusively from frontend/ directory; avoids exposing repo root or server/
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// ── Legacy Data Route ───────────────────────────────────────
const legacyParkingJsonPath = path.join(__dirname, '..', 'data', 'parking.json');
app.get('/data/parking.json', (req, res) => {
  res.sendFile(legacyParkingJsonPath);
});

// ── API 404 Fallback ────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
    code: 'NOT_FOUND',
  });
});

// ── Centralized Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test' && status >= 500) {
    console.error('[Error]', err);
  }

  // Diagnostic stack traces are strictly kept in server logs, never in JSON responses
  res.status(status).json({
    success: false,
    message,
  });
});

module.exports = app;
