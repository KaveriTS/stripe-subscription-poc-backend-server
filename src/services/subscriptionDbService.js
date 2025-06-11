const Customer = require('../models/customer.model');
const Subscription = require('../models/subscription.model');
const { AppError } = require('../middleware/errorHandler');

// Find customer by email
const findCustomerByParam = async (data) => {
  return await Customer.findOne(data);
};

// Create new customer
const createCustomer = async (customerData) => {
  return await Customer.create(customerData);
};

// Update customer
const updateCustomer = async (customerId, updateData) => {
  return await Customer.findByIdAndUpdate(
    customerId,
    updateData,
    { new: true }
  );
};


// Create new subscription
 
const createSubscription = async (subscriptionData) => {
  return await Subscription.create(subscriptionData);
};

// Find all subscriptions for customer
const findCustomerSubscriptions = async (customerId) => {
  return await Subscription.find({ customerId })
    .sort({ createdAt: -1 })
    .populate('customerId');
};

module.exports = {
  findCustomerByParam,
  createCustomer,
  updateCustomer,
  createSubscription,
  findCustomerSubscriptions,
}; 