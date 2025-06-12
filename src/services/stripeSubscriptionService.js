const { stripeSubscriptionClient } = require('../config/stripeClients');
const subscriptionDbService = require('./subscriptionDbService');
const { AppError } = require('../middleware/errorHandler');

// Creates a new customer in Stripe and our database

const createStripeCustomer = async (email, metadata = {}) => {
  try {
    // check if email already exists in our database
    const existingCustomer = await subscriptionDbService.findCustomerByParam({email});
    if (existingCustomer) {
      throw new AppError('Customer already exists with this email', 400);
    }
    const customerData = {
      email,
      test_clock: metadata.test_clock_id || null, // Optional test clock ID for testing purposes
      metadata: {
        created_by: 'subscription_backend',
      }
    };

    // Add additional metadata if provided
    if (metadata && Object.keys(metadata).length > 0) {
      customerData.metadata = {
        ...customerData.metadata,
        ...metadata
      };
    }

    // Create customer in Stripe
    const stripeCustomer = await stripeSubscriptionClient.customers.create(customerData);

    // Save customer in our database
    const dbCustomer = await subscriptionDbService.createCustomer({
      email,
      stripeCustomerId: stripeCustomer.id,
      metadata: customerData.metadata
    });

    return {
      ...stripeCustomer,
      dbId: dbCustomer._id
    };
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new AppError('Failed to create customer in payment system', 500);
  }
};

// Creates a new subscription in Stripe and our database

const createSubscription = async (customerId, priceId, paymentMethodId, productId, options = {}) => {
  try {
    // Get customer from our database
    const customer = await subscriptionDbService.findCustomerByParam({stripeCustomerId: customerId});
    if (!customer) {
      throw new AppError('Customer not found in database', 404);
    }

    // Get price details from Stripe
    const price = await stripeSubscriptionClient.prices.retrieve(priceId);
    const product = await stripeSubscriptionClient.products.retrieve(price.product);
    // console.log('Product Method Check:', product);

    // const check = await stripeSubscriptionClient.paymentMethods.retrieve(paymentMethodId);
    // console.log('Payment Method Check:', check);
    // await stripeSubscriptionClient.paymentMethods.attach(paymentMethodId, {
    //   customer: customerId
    // });

    // await stripeSubscriptionClient.customers.update(customerId, {
    //   invoice_settings: {
    //     default_payment_method: paymentMethodId
    //   }
    // });
    const subscriptionData = {
      customer: customerId,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        created_by: 'subscription_backend',
        ...options.metadata
      }
    };

    // Create subscription in Stripe
    const stripeSubscription = await stripeSubscriptionClient.subscriptions.create(subscriptionData);

    // Save subscription in our database
    const dbSubscription = await subscriptionDbService.createSubscription({
      customerId: customer._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      stripeProductId: product.id,
      planId: productId,
      paymentMethodId: paymentMethodId,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
      metadata: subscriptionData.metadata
    });

    return {
      ...stripeSubscription,
      dbId: dbSubscription._id,
      clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new AppError('Failed to create subscription', 500);
  }
};

// Retrieve a subscription from Stripe Account A

const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripeSubscriptionClient.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    if (error.code === 'resource_missing') {
      throw new AppError('Subscription not found', 404);
    }
    throw new AppError('Failed to retrieve subscription', 500);
  }
};

// Retrieve upcoming invoice for a subscription

const getUpcomingInvoice = async (subscriptionId) => {
  try {
    const invoice = await stripeSubscriptionClient.invoices.retrieveUpcoming({
      subscription: subscriptionId
    });
    return invoice;
  } catch (error) {
    console.error('Error retrieving upcoming invoice:', error);
    if (error.code === 'invoice_upcoming_none') {
      return null; // No upcoming invoice
    }
    throw new AppError('Failed to retrieve upcoming invoice', 500);
  }
};

// Get all products with their prices from Stripe Account A

const getStripeProducts = async () => {
  try {
    const products = await stripeSubscriptionClient.products.list({
      active: true,
      expand: ['data.default_price']
    });

    const prices = await stripeSubscriptionClient.prices.list({
      active: true,
      expand: ['data.product']
    });
    // Group prices by product
    const productsWithPrices = products.data.map(product => {
      const productPrices = prices.data.filter(price => price.product.id === product.id);

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        metadata: product.metadata,
        active: product.active,
        created: product.created,
        updated: product.updated,
        prices: productPrices.map(price => ({
          id: price.id,
          currency: price.currency,
          amount: price.unit_amount,
          interval: price.recurring?.interval,
          intervalCount: price.recurring?.interval_count,
          type: price.type, // 'recurring' or 'one_time'
          nickname: price.nickname,
          metadata: price.metadata,
          active: price.active
        }))
      };
    });
    return productsWithPrices;
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    throw new AppError('Failed to fetch products from Stripe', 500);
  }
};


// Get all active prices from Stripe Account A
const getStripePrices = async () => {
  try {
    const prices = await stripeSubscriptionClient.prices.list({
      active: true,
      expand: ['data.product']
    });

    return prices.data.map(price => ({
      id: price.id,
      product: {
        id: price.product.id,
        name: price.product.name,
        description: price.product.description
      },
      currency: price.currency,
      amount: price.amount,
      formattedAmount: (price.amount / 100).toFixed(2),
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
      type: price.type,
      nickname: price.nickname,
      metadata: price.metadata,
      active: price.active
    }));
  } catch (error) {
    console.error('Error fetching Stripe prices:', error);
    throw new AppError('Failed to fetch prices from Stripe', 500);
  }
};

const createTestClock = async () => {
  const testClock = await stripeSubscriptionClient.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000), // start from current time
    name: 'Daily Subscription Simulation'
  });
  return testClock;
};


module.exports = {
  createStripeCustomer,
  createSubscription,
  getSubscription,
  getUpcomingInvoice,
  getStripeProducts,
  getStripePrices,
  createTestClock,
};