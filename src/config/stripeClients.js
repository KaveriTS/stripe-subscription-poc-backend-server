const Stripe = require('stripe');
const config = require('./env');

// Stripe Account A - Handles subscription management, products, and plans
const stripeSubscriptionClient = Stripe(config.stripeA.secretKey);

// Stripe Account B - Handles payment processing
const stripePaymentClient = Stripe(config.stripeB.secretKey);

module.exports = {
  stripeSubscriptionClient,
  stripePaymentClient
}; 