// notification.model.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['published', 'revision', 'rejection', 'submitted', 'archived', 'unarchived'],
    required: true
  },
  message: {  // Add message field
    type: String,
    required: function() { return ['revision', 'rejection'].includes(this.type); }
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  category: String,
  college: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // Automatically delete after 7 days
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  archiveInfo: {
    date: Date,
    admin: String,
    reason: String
  }
});

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
