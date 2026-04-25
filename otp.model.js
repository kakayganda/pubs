const { Schema, model } = require('mongoose');

const otpSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes
  }
});

const OTP = model('OTP', otpSchema);

module.exports = OTP;
