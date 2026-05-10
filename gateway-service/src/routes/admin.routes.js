const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');

// Admin auth middleware
const adminAuth = require('../middleware/adminAuth.middleware');

router.use(adminAuth);

// ── System ───────────────────────────────────────────────
router.get('/stats', ctrl.getSystemStats);

// ── Users ────────────────────────────────────────────────
router.post('/users', ctrl.createUser);
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUserById);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.post('/users/:id/regenerate-key', ctrl.regenerateApiKey);

// ── Rate Policies ────────────────────────────────────────
router.post('/policies', ctrl.createRatePolicy);
router.get('/policies', ctrl.listRatePolicies);
router.put('/policies/:id', ctrl.updateRatePolicy);
router.delete('/policies/:id', ctrl.deleteRatePolicy);

// ── IP Management ───────────────────────────────────────

// Get all blocked IPs
router.get('/blocked-ips', ctrl.listBlockedIPs);

// Manually block an IP
router.post('/blocked-ips', ctrl.blockIP);

// Unblock specific IP
router.delete('/blocked-ips/:ip', ctrl.unblockIPController);

// 🔥 NEW: Unblock ALL IPs
router.delete('/blocked-ips', ctrl.unblockAllIPsController);

module.exports = router;