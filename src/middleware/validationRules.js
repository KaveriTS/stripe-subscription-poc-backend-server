const { body, param } = require('express-validator');

// Validation rules for creating a subscription
const subscriptionValidationRules = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address'),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('Payment method ID is required'),
    body('priceId')
      .notEmpty()
      .withMessage('Price ID is required'),
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
  ];
};

//validation rules for getting subscription status by email
const getSubscriptionStatusValidationRules = () => {
  return [
    param('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address')
  ];
};

module.exports = {
  subscriptionValidationRules,
  getSubscriptionStatusValidationRules,
};