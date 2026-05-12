const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// GET endpoint for webhook verification (Meta requirement)
router.get('/', webhookController.verifyWebhook);

// POST endpoint for receiving webhook events
router.post('/', webhookController.handleWebhook);

module.exports = router;
