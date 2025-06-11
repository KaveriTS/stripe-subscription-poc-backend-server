const express = require('express');
const {
  getStripeProductsList,
} = require('../controllers/subscription.controller');
const router = express.Router();

router.get('/', getStripeProductsList);

module.exports = router;