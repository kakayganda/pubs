const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOTPEmailPasswordReset = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'PubShark - Password Reset Verification',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #2d3748;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f7fafc;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            .header {
              text-align: center;
              padding-bottom: 30px;
              border-bottom: 2px solid #edf2f7;
              margin-bottom: 30px;
            }
            .logo {
              color: #2b6cb0;
              font-size: 32px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .subtitle {
              color: #4a5568;
              font-size: 16px;
              margin-top: 8px;
            }
            .otp-container {
              background: linear-gradient(135deg, #c53030 0%, #e53e3e 100%);
              border-radius: 12px;
              padding: 25px;
              margin: 30px 0;
              text-align: center;
            }
            .otp {
              font-size: 36px;
              font-weight: bold;
              color: #ffffff;
              letter-spacing: 4px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .security-notice {
              background-color: #fff5f5;
              border-left: 4px solid #c53030;
              border-radius: 0 8px 8px 0;
              padding: 20px;
              margin: 30px 0;
            }
            .security-notice ul {
              margin: 15px 0 0 20px;
              padding: 0;
            }
            .security-notice li {
              margin-bottom: 10px;
              color: #4a5568;
            }
            .expiry-warning {
              background-color: #fffaf0;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              font-size: 14px;
              color: #c05621;
            }
            .footer {
              text-align: center;
              color: #718096;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #edf2f7;
            }
            .contact-support {
              margin: 15px 0;
            }
            .warning {
              font-size: 13px;
              color: #718096;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">PubShark</h1>
              <div class="subtitle">University of Northern Philippines Publication System</div>
            </div>
            <p>Hello,</p>
            <p>We received a request to reset your password for your PubShark account. To proceed with the password reset, please use the following verification code:</p>
            <div class="otp-container">
              <div class="otp">${otp}</div>
            </div>
            <div class="expiry-warning">
              ⚠️ This verification code will expire in 10 minutes for security purposes.
            </div>
            <div class="security-notice">
              <strong>Security Reminders:</strong>
              <ul>
                <li>Never share your verification code with anyone</li>
                <li>PubShark staff will never ask for your password</li>
                <li>Use a strong, unique password for your account</li>
                <li>Enable two-factor authentication for additional security</li>
              </ul>
            </div>
            <p class="warning">If you didn't request this password reset, please ignore this email and contact our support team immediately if you have any concerns.</p>
            <div class="footer">
              <div class="contact-support">
                Need help? Contact us at support@pubshark.unp.edu.ph
              </div>
              <p>&copy; ${new Date().getFullYear()} PubShark - University of Northern Philippines. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmailPasswordReset };