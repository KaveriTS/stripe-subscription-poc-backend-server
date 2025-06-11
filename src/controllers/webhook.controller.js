const Subscription = require('../models/subscription.model');
const Customer = require('../models/customer.model');
const { stripeSubscriptionClient } = require('../config/stripeClients');
const { processSubscriptionPayment } = require('../services/stripePaymentService');
const { sendPaymentRetryEmail, sendSubscriptionConfirmationEmail } = require('../services/emailService');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const config = require('../config/env');

/**
 * Handle Stripe webhook events from Account A
 */
const handleStripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripeSubscriptionClient.webhooks.constructEvent(
      req.body,
      sig,
      config.stripeA.webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new AppError('Webhook signature verification failed', 400);
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
});
const handleInvoiceCreated = async (invoice) => {
  console.log('Processing invoice.created event:', invoice.id);

  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription || null;

  if (invoice.paid || !subscriptionId) {
    console.log('Skipping invoice:', invoice.id, 'Already paid or no subscription');
    return;
  }

  try {
    const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId }).populate('customerId');

    if (!subscription) {
      console.error('Subscription not found for invoice:', invoice.id);
      return;
    }

    if (invoice.amount_due === 0) {
      console.log('Zero-amount invoice. Skipping payment.');
      return;
    }

    // Attempt manual payment using Account B
    const paymentResult = await processSubscriptionPayment(
      invoice.id,
      invoice.amount_due,
      subscription.paymentMethodId,
      subscription.customerId._id.toString()
    );

    console.log('Payment processing result:', paymentResult);

    // Case 1: Payment succeeded
    if (paymentResult.success) {
      subscription.status = 'active';
      subscription.retryAttempts = 0;
      subscription.lastPaymentAt = new Date();
      await subscription.save();

      console.log('Payment succeeded for subscription:', subscription._id);
    }

    // Case 2: Payment requires 3D Secure (requires_action)
    else if (paymentResult.requiresAction) {
      console.warn('Payment requires user action (3D Secure) for subscription:', subscription._id);
    }

    // Case 3: Payment failed
    else {
      console.log('Payment failed for subscription:', subscription._id);

      subscription.status = 'past_due';
      subscription.retryAttempts += 1;
      subscription.lastRetryAt = new Date();
      subscription.lastInvoiceUrl = invoice.hosted_invoice_url;
      await subscription.save();

      // Send retry email
      try {
        await sendPaymentRetryEmail(
          subscription.customerId.email,
          subscription.customerId.fullName || 'Customer',
          invoice.hosted_invoice_url,
          invoice.amount_due,
          invoice.currency
        );
        console.log('Retry email sent to:', subscription.customerId.email);
      } catch (emailErr) {
        console.error('Failed to send retry email:', emailErr);
      }
    }

  } catch (error) {
    console.error('Error in handleInvoiceCreated:', error);
  }
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  console.log('Processing invoice.payment_succeeded event:', invoice.id);
  const subscriptionId = invoice.parent?.subscription_details?.subscription || null;
  if (!subscriptionId) {
    console.log('No subscription found for this invoice:');
    return;
  }

  try {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId
    }).populate('customerId');
    console.log("SUBSCRIPTION Succeeded", subscription);
    if (!subscription) {
      console.error('Subscription not found for successful payment:');
      return;
    }

    const wasRetry = subscription.retryAttempts > 0;

    // Reset state
    subscription.status = 'active';
    subscription.retryAttempts = 0;
    await subscription.save();

    const price = invoice.lines?.data?.[0]?.price;
    const periodEnd = invoice.lines?.data?.[0]?.period?.end;

    const planDetails = {
      planId: price?.id,
      nextBillingDate: new Date(periodEnd * 1000)
    };

    // Send confirmation email if first-time or retry
    if (wasRetry || invoice.billing_reason === 'subscription_create') {
      try {
        await sendSubscriptionConfirmationEmail(
          subscription.customerId.email,
          subscription.customerId.fullName || 'Customer',
          planDetails
        );
        console.log('Confirmation email sent to:', subscription.customerId.email);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }

    console.log('Successfully processed payment for subscription:', subscription._id);

  } catch (error) {
    console.error('Error processing invoice.payment_succeeded:', error);
  }
};


/**
 * Handle customer.subscription.updated event
 */
const handleSubscriptionUpdated = async (stripeSubscription) => {
  console.log('Processing subscription.updated event:', stripeSubscription.id);
  
  try {
    // Find and update subscription in database
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id
    });

    if (!subscription) {
      console.error('Subscription not found for update:', stripeSubscription.id);
      return;
    }

    // Update subscription details
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    
    if (stripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }

    await subscription.save();
    console.log('Updated subscription:', subscription._id);

  } catch (error) {
    console.error('Error processing subscription.updated:', error);
    throw error;
  }
};

/**
 * Handle customer.subscription.deleted event
 */
const handleSubscriptionDeleted = async (stripeSubscription) => {
  console.log('Processing subscription.deleted event:', stripeSubscription.id);
  
  try {
    // Find and update subscription in database
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id
    });

    if (!subscription) {
      console.error('Subscription not found for deletion:', stripeSubscription.id);
      return;
    }

    // Update subscription status
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    await subscription.save();

    console.log('Deleted subscription:', subscription._id);

  } catch (error) {
    console.error('Error processing subscription.deleted:', error);
    throw error;
  }
};


module.exports = {
  handleStripeWebhook,
}; 