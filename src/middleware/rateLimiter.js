const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// General rate limiter for all API routes
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for subscription creation
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    status: 'error',
    message: 'Too many subscription attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, 
});

// Rate limiter for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, 
  message: {
    status: 'error',
    message: 'Too many webhook requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return false;
  }
});

module.exports = {
  generalLimiter,
  subscriptionLimiter,
  webhookLimiter
}; 