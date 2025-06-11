const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhook.controller');
const { webhookLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/stripe',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

module.exports = router; 