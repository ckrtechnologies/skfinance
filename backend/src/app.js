'use strict';
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const { errorHandler } = require('./shared/middleware/errorHandler');

// Route modules
const authRoutes       = require('./api/auth/routes');
const customerRoutes   = require('./api/customer-app/routes');
const dealerRoutes     = require('./api/dealer-app/routes');
const staffAppRoutes   = require('./api/staff-app/routes');
const staffPanelRoutes = require('./api/staff-panel/routes');
const adminRoutes      = require('./api/admin-panel/routes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes);
app.use('/customer',     customerRoutes);
app.use('/dealer',       dealerRoutes);
app.use('/staff-app',    staffAppRoutes);
app.use('/staff-panel',  staffPanelRoutes);
app.use('/admin',        adminRoutes);

// ── Global error handler ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
