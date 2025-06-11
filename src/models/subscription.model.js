const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  paymentMethodId: {
    type: String,
    required: true
  },
  planId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid'
    ],
    default: 'incomplete'
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  trialStart: {
    type: Date
  },
  trialEnd: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  interval: {
    type: String,
    required: true
  },
  intervalCount: {
    type: Number,
    required: true,
    default: 1
  },
  retryAttempts: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

subscriptionSchema.virtual('needsRetry').get(function() {
  return this.status === 'past_due' || this.status === 'unpaid';
});

subscriptionSchema.virtual('formattedAmount').get(function() {
  return (this.amount / 100).toFixed(2);
});

subscriptionSchema.index({ customerId: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 