const express = require('express');
const router = express.Router();
const { healthCheck, livenessProbe, readinessProbe } = require('../controllers/health.controller');

router.get('/', healthCheck);
router.get('/live', livenessProbe);
router.get('/ready', readinessProbe);

module.exports = router;
