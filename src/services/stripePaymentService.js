const { stripePaymentClient } = require('../config/stripeClients');
const { AppError } = require('../middleware/errorHandler');

//Create a payment intent for manual payment processing
const createPaymentIntent = async (amount, currency = 'usd', paymentMethodId, metadata = {}) => {
  try {
    const paymentIntent = await stripePaymentClient.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment-result`,
      metadata: {
        ...metadata,
        processed_by: 'payment_backend'
      }
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe PaymentIntent error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      decline_code: error.decline_code,
      raw: error.raw
    });

    throw error;
  }
};

//Process a payment for subscription billing

const processSubscriptionPayment = async (invoiceId, amount, paymentMethodId, customerId) => {
  try {
    const metadata = {
      invoice_id: invoiceId,
      customer_id: customerId,
      payment_type: 'subscription'
    };

    const paymentIntent = await createPaymentIntent(
      amount,
      'usd',
      paymentMethodId,
      metadata
    );

    console.log('PaymentIntent status:', paymentIntent.status);

    // Handle Stripe PaymentIntent status
    switch (paymentIntent.status) {
      case 'succeeded':
        return {
          success: true,
          paymentIntent
        };

      case 'requires_action':
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntent
        };

      case 'requires_payment_method':
      case 'requires_confirmation':
      default:
        return {
          success: false,
          error: 'Payment failed or needs retry',
          paymentIntent
        };
    }

  } catch (error) {
    console.error('Error processing subscription payment:', {
      message: error.message,
      type: error.type,
      code: error.code,
      decline_code: error.decline_code,
      raw: error.raw
    });

    return {
      success: false,
      error: error.message || 'Payment processing failed'
    };
  }
};


module.exports = {
  createPaymentIntent,
  processSubscriptionPayment,
}; 