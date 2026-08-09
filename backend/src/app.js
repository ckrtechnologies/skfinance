'use strict';
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const { errorHandler } = require('./shared/middleware/errorHandler');

// Route modules
const authRoutes          = require('./api/auth/routes');
const customerRoutes      = require('./api/customer-app/routes');
const dealerRoutes        = require('./api/dealer-app/routes');
const dealerOnboarding    = require('./api/dealer-app/onboarding-routes');
const staffAppRoutes      = require('./api/staff-app/routes');
const staffPanelRoutes    = require('./api/staff-panel/routes');
const adminRoutes         = require('./api/admin-panel/routes');
const digilockerRoutes    = require('./api/digilocker/routes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

const path = require('path');
const { CDN_LOCAL_PATH } = require('./config/secrets');

// ── Serve CDN static files ────────────────────────────────────────────
app.use('/cdn', express.static(path.resolve(CDN_LOCAL_PATH)));

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/auth',              authRoutes);
app.use('/customer',          customerRoutes);
app.use('/dealer/onboarding', dealerOnboarding);   // onboarding BEFORE generic dealer routes
app.use('/dealer',            dealerRoutes);
app.use('/staff-app',         staffAppRoutes);
app.use('/staff-panel',       staffPanelRoutes);
app.use('/admin',             adminRoutes);
app.use('/digilocker',        digilockerRoutes);

// ── Global error handler ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
