// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Stripe-specific errors
const handleStripeError = (error) => {
  let message = 'Payment processing error';
  let statusCode = 400;

  switch (error.type) {
    case 'StripeCardError':
      message = error.message || 'Your card was declined';
      statusCode = 400;
      break;
    case 'StripeRateLimitError':
      message = 'Too many requests made to the API too quickly';
      statusCode = 429;
      break;
    case 'StripeInvalidRequestError':
      message = error.message || 'Invalid parameters were supplied to Stripe API';
      statusCode = 400;
      break;
    case 'StripeAPIError':
      message = 'An error occurred with the Stripe API';
      statusCode = 502;
      break;
    case 'StripeConnectionError':
      message = 'A network communication with Stripe failed';
      statusCode = 503;
      break;
    case 'StripeAuthenticationError':
      message = 'Authentication with Stripe API failed';
      statusCode = 401;
      break;
    default:
      message = error.message || 'Payment processing error';
  }

  return new AppError(message, statusCode);
};

// Handle MongoDB validation errors
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle MongoDB duplicate key errors
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `${field}: '${value}' already exists`;
  return new AppError(message, 409);
};

// Handle MongoDB cast errors
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};


// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle different types of errors
    if (err.name === 'StripeError' || err.type?.startsWith('Stripe')) {
      error = handleStripeError(err);
    } else if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    } else if (err.code === 11000) {
      error = handleDuplicateKeyError(err);
    } else if (err.name === 'CastError') {
      error = handleCastError(err);
    }

  }
};

// Async error catcher wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync
}; 