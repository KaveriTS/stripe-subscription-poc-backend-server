const express = require('express');
const {
  createNewSubscription,
  getSubscriptionStatusByEmail
} = require('../controllers/subscription.controller');

const { subscriptionLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');
const {
  subscriptionValidationRules,
  getSubscriptionStatusValidationRules,
} = require('../middleware/validationRules');

const router = express.Router();

router.post(
  '/',
  subscriptionLimiter,
  subscriptionValidationRules(),
  validateRequest,
  createNewSubscription
);

router.get('/status', 
  getSubscriptionStatusValidationRules(),
  validateRequest,
  getSubscriptionStatusByEmail
);

module.exports = router;