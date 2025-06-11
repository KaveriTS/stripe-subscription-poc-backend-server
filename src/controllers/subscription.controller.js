const { createStripeCustomer, createSubscription, cancelStripeSubscription, retryStripePayment } = require('../services/stripeSubscriptionService');
const { stripeSubscriptionClient } = require('../config/stripeClients');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const {  getStripePrices, getStripeProducts } = require('../services/stripeSubscriptionService');
const subscriptionDbService = require('../services/subscriptionDbService');

/**
 * Get prices List
 */
const getStripePricesList = catchAsync(async (req, res) => {
  const prices = await getStripePrices();

  res.status(200).json({
    status: 'success',
    data: {
      prices
    }
  });
});

/**
 * Get Products List
 */
const getStripeProductsList = catchAsync(async (req, res) => {
  const products = await getStripeProducts();

  res.status(200).json({
    status: 'success',
    data: {
      products
    }
  });
});

/**
 * Create a subscription
 */
const createNewSubscription = catchAsync(async (req, res) => {
  const { email, paymentMethodId, productId, priceId } = req.body;

  // Create or get customer
  const customer = await createStripeCustomer(email, paymentMethodId);

  // Create subscription
  const subscription = await createSubscription(customer.id, priceId, paymentMethodId, productId);

  res.status(201).json({
    status: 'success',
    data: {
      subscription
    }
  });
});

/**
 * Get subscription status by email
 */
const getSubscriptionStatusByEmail = catchAsync(async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Find customer by email
  const customer = await subscriptionDbService.findCustomerByParam({email});
  if (!customer) {
    return res.status(200).json({
      status: 'success',
      data: {
        hasSubscription: false,
        subscriptions: []
      }
    });
  }

  // Get all subscriptions for the customer
  const subscriptions = await subscriptionDbService.findCustomerSubscriptions(customer._id);

  // Get Stripe subscription details and invoices for each subscription
  const subscriptionDetails = await Promise.all(subscriptions.map(async (sub) => {
    const stripeSubscription = await stripeSubscriptionClient.subscriptions.retrieve(sub.stripeSubscriptionId);
    const stripePrice = await stripeSubscriptionClient.prices.retrieve(sub.stripePriceId);
    const stripeProduct = await stripeSubscriptionClient.products.retrieve(stripePrice.product);
    
    // Get invoices for this subscription
    const invoices = await stripeSubscriptionClient.invoices.list({
      subscription: sub.stripeSubscriptionId,
      limit: 5 // Get last 5 invoices
    });

    return {
      id: sub._id,
      status: sub.status,
      plan: {
        id: stripeProduct.id,
        nickname: stripeProduct.name,
        amount: stripePrice.unit_amount,
        currency: stripePrice.currency,
        interval: stripePrice.recurring.interval,
        interval_count: stripePrice.recurring.interval_count
      },
      current_period_start: Math.floor(sub.currentPeriodStart.getTime() / 1000),
      current_period_end: Math.floor(sub.currentPeriodEnd.getTime() / 1000),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      customer: {
        id: customer._id,
        email: customer.email
      },
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        status: invoice.status,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url
      }))
    };
  }));

  res.status(200).json({
    status: 'success',
    data: {
      hasSubscription: subscriptions.length > 0,
      subscriptions: subscriptionDetails
    }
  });
});

module.exports = {
  createNewSubscription,
  getSubscriptionStatusByEmail,
  getStripePricesList,
  getStripeProductsList
}; 