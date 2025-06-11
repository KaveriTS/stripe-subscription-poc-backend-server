const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware to check validation results and return errors if validation fails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Extract error messages
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    // Create a formatted error message
    const formattedMessage = errorMessages
      .map(err => `${err.field}: ${err.message}`)
      .join(', ');
    
    return next(new AppError(`Validation failed: ${formattedMessage}`, 400));
  }
  
  next();
};

module.exports = validateRequest; 