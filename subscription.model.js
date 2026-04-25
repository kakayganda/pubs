// models/subscription.model.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  confirmationToken: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = Subscription;