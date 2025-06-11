require('dotenv').config();

// Only require critical environment variables in production
const requiredEnvVars = process.env.NODE_ENV === 'production' ? [
  'MONGODB_URI',
  'STRIPE_A_SECRET_KEY',
  'STRIPE_B_SECRET_KEY',
  'STRIPE_A_WEBHOOK_SECRET'
] : [];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  // Server config
  port: process.env.PORT || 7000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database config
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription-poc',
  
  // Stripe Account A (Subscription Management)
  stripeA: {
    publishableKey: process.env.STRIPE_A_PUBLISHABLE_KEY || 'pk_test_placeholder_for_development',
    secretKey: process.env.STRIPE_A_SECRET_KEY || 'sk_test_placeholder_for_development',
    webhookSecret: process.env.STRIPE_A_WEBHOOK_SECRET || 'whsec_placeholder_for_development'
  },
  
  // Stripe Account B (Payment Processing)
  stripeB: {
    publishableKey: process.env.STRIPE_B_PUBLISHABLE_KEY || 'pk_test_placeholder_for_development',
    secretKey: process.env.STRIPE_B_SECRET_KEY || 'sk_test_placeholder_for_development'
  },
  
  // Email config
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
}; 