const express = require('express');
const { getStripePricesList } = require('../controllers/subscription.controller');

const router = express.Router();

router.get('/', getStripePricesList);

module.exports = router; 