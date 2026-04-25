// routes/subscription.route.js
const express = require('express');
const router = express.Router();
const Subscription = require('../model/subscription.model');
const crypto = require('crypto');
const transporter = require('../config/emailConfig.js');

// Subscribe endpoint
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    
    await Subscription.findOneAndUpdate(
      { email },
      { 
        email,
        confirmationToken,
        confirmed: false
      },
      { upsert: true }
    );

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-subscription?token=${confirmationToken}&email=${email}`;
    
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Confirm your PubShark subscription',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: Arial, sans-serif;">
          <img src="${process.env.FRONTEND_URL}/logo.png" alt="PubShark Logo" style="max-width: 200px; margin-bottom: 30px;">
          
          <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px; text-align: center;">Welcome to PubShark!</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
              Thanks for joining! Please confirm your subscription to start receiving our updates.
            </p>

            <div style="text-align: center;">
              <a href="${confirmUrl}" 
                style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; 
                        border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 16px;
                        mso-padding-alt: 0;">
                <!--[if mso]>
                <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                <![endif]-->
                <span style="mso-text-raise: 15pt;">Confirm Subscription</span>
                <!--[if mso]>
                <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
                <![endif]-->
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px; text-align: center;">
              If the button doesn't work, copy and paste this link:
              <br>
              <a href="${confirmUrl}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">
                ${confirmUrl}
              </a>
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
            © ${new Date().getFullYear()} PubShark. All rights reserved.
          </p>
        </div>
      `
    });

    res.status(200).json({ message: 'Confirmation email sent' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Subscription failed!' });
  }
});

// Confirm subscription endpoint
router.get('/confirm', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    const subscription = await Subscription.findOne({
      email,
      confirmationToken: token
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid confirmation link' });
    }

    await Subscription.findByIdAndUpdate(subscription._id, {
      confirmed: true,
      confirmationToken: null
    });

    res.redirect(`${process.env.FRONTEND_URL}/subscription-confirmed`);
  } catch (error) {
    res.status(500).json({ error: 'Confirmation failed' });
  }
});

module.exports = router;