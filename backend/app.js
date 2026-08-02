'use strict';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const secrets = require('./src/config/secrets');
const { errorHandler } = require('./src/shared/middleware/errorHandler');

// Route groups
const authRoutes = require('./src/api/auth/routes');
const customerRoutes = require('./src/api/customer-app/routes');
const dealerRoutes = require('./src/api/dealer-app/routes');
const staffAppRoutes = require('./src/api/staff-app/routes');
const staffPanelRoutes = require('./src/api/staff-panel/routes');
const adminRoutes = require('./src/api/admin-panel/routes');

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan(secrets.nodeEnv === 'production' ? 'combined' : 'dev'));

// ─── CDN static serving (local dev only) ─────────────────────────────
// In production, Nginx serves /cdn/ via X-Accel-Redirect (internal location).
// In dev, Express streams directly.
if (secrets.nodeEnv !== 'production') {
  app.use('/cdn', express.static(path.resolve(secrets.cdn.baseDir)));
}

// ─── API routes — v1 ─────────────────────────────────────────────────
app.use('/v1/auth', authRoutes);
app.use('/v1/customer', customerRoutes);
app.use('/v1/dealer', dealerRoutes);
app.use('/v1/staff', staffAppRoutes);       // Staff App
app.use('/v1/panel/staff', staffPanelRoutes); // Staff Panel (same contract, separate mount)
app.use('/v1/admin', adminRoutes);

// ─── Health check ─────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: secrets.nodeEnv }));

// ─── 404 ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ─── Global error handler (must be last) ─────────────────────────────
app.use(errorHandler);

module.exports = app;
