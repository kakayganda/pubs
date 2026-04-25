// notifications.route.js
const express = require('express');
const router = express.Router();
const Notification = require('../model/notification.model');
const verifyToken = require('../middleware/verifyToken');
const User = require('../model/user.model');

// Get notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log("Notifications GET request from user:", req.user.id, "with role:", req.user.role);

    // Prepare the query based on user role and ID
    let query = { recipient: req.user.id };

    // Build type filter based on user role
    if (req.user.role === 'admin') {
      // Admin users can see all notification types including 'submitted'
      // No need to filter by type for admins
    } else if (req.user.role === 'writer') {
      // Writers can see 'published', 'revision', 'rejection' notifications
      query.type = { $in: ['published', 'revision', 'rejection'] };
    } else {
      // Regular users can only see 'published' notifications
      query.type = 'published';
    }

    console.log("Notification query:", JSON.stringify(query));

    // Fetch notifications with populated article and author details
    const notifications = await Notification.find(query)
      .populate({
        path: 'article',
        select: 'title coverImg college category author status',
        populate: {
          path: 'author',
          select: 'username'
        }
      })
      .sort({ createdAt: -1 });

    console.log("Found notifications:", notifications.length);

    // Transform the notifications for the response
    const formattedNotifications = notifications
      .filter(notification => notification.article) // Skip notifications with null articles
      .map(notification => ({
        id: notification._id,
        type: notification.type,
        read: notification.read,
        time: notification.createdAt,
        message: notification.message,
        article: {
          id: notification.article._id,
          title: notification.article.title,
          coverImg: notification.article.coverImg,
          college: notification.article.college,
          category: notification.article.category,
          author: notification.article.author
        }
      }));

    console.log("Formatted notifications:", formattedNotifications.length);

    res.status(200).json({
      success: true,
      notifications: formattedNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/read/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Make sure the notification belongs to the user
    if (!notification.recipient.equals(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this notification' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// Clear all notifications
router.delete('/clear', verifyToken, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Error clearing notifications' });
  }
});

// Create a new notification - FIXED VERSION
// Modified POST route in notifications.route.js
router.post('/', verifyToken, async (req, res) => {
  try {
    const { articleId, type, message } = req.body;

    // Handle 'submitted' and 'revision-submitted' notifications (send to all admins)
    if (type === 'submitted' || type === 'revision-submitted') {
      try {
        // Find all admin users
        const admins = await User.find({ role: 'admin' }, '_id');

        if (admins.length === 0) {
          console.warn('No admin users found for notifications');
          return res.status(200).json({
            success: true,
            message: 'No admin users to notify',
            notifications: []
          });
        }

        // Map 'revision-submitted' to 'submitted' type in the notification model
        const notificationType = type === 'revision-submitted' ? 'submitted' : type;

        // Create notifications for each admin
        const notificationDocs = admins.map(admin => ({
          article: articleId,
          recipient: admin._id,
          type: notificationType,
          message: message || `New article submitted for review`
        }));

        const createdNotifications = await Notification.insertMany(notificationDocs);
        console.log(`Created ${createdNotifications.length} admin notifications`);

        // Return success
        return res.status(201).json({
          success: true,
          message: `Sent notifications to ${admins.length} admins`,
          notifications: createdNotifications
        });
      } catch (error) {
        console.error('Error creating admin notifications:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create admin notifications'
        });
      }
    }

    // For other notification types that need a specific recipient
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required for non-submitted notifications'
      });
    }

    if (['rejection', 'revision'].includes(type) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create rejection/revision notifications'
      });
    }

    const notification = new Notification({
      article: articleId,
      recipient: recipientId,
      type: type || 'published',
      message: message || undefined
    });

    const savedNotification = await notification.save();

    return res.status(201).json({
      success: true,
      notification: savedNotification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification'
    });
  }
});

// Get all admin users
// Modify the endpoint in notifications.route.js
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }, '_id username email');

    // Add this to also fetch all users
    const allUsers = await User.find({}, '_id username email');

    res.status(200).json({
      success: true,
      admins,
      users: allUsers  // Include all users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

router.get('/users', async (req, res) => {
  // This endpoint should exist and return all users
  try {
    const users = await User.find({}, '_id username email');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

module.exports = router;
