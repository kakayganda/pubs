const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOTPEmailRegistration = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to PubShark - Verify Your Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Verification</title>
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
              background: linear-gradient(135deg, #2b6cb0 0%, #4299e1 100%);
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
            .next-steps {
              background-color: #f8fafc;
              border-left: 4px solid #2b6cb0;
              border-radius: 0 8px 8px 0;
              padding: 20px;
              margin: 30px 0;
            }
            .next-steps ol {
              margin: 15px 0 0 20px;
              padding: 0;
            }
            .next-steps li {
              margin-bottom: 10px;
              color: #4a5568;
            }
            .unp-info {
              background-color: #ebf8ff;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              font-size: 14px;
              color: #2c5282;
            }
            .footer {
              text-align: center;
              color: #718096;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #edf2f7;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              color: #2b6cb0;
              text-decoration: none;
              margin: 0 10px;
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
            <p>Welcome to PubShark! 👋</p>
            <p>Thank you for joining UNP's official online publication platform. To begin sharing and accessing campus news and stories, please verify your email address using this verification code:</p>
            <div class="otp-container">
              <div class="otp">${otp}</div>
            </div>
            <div class="next-steps">
              <strong>Get Started with PubShark:</strong>
              <ol>
                <li>Enter the verification code above to activate your account</li>
                <li>Complete your profile with your UNP credentials</li>
                <li>Start exploring latest campus news and stories</li>
                <li>Contribute to the UNP community through your articles</li>
              </ol>
            </div>
            <div class="unp-info">
              <strong>About PubShark:</strong><br>
              Your gateway to UNP's latest news, events, achievements, and stories. Stay connected with your university community through our digital publication platform.
            </div>
            <div class="footer">
              <p>Need assistance? Contact our support team at support@pubshark.unp.edu.ph</p>
              <div class="social-links">
                Follow UNP: 
                <a href="https://www.facebook.com/UNPTheOfficial">Facebook</a> | 
                <a href="https://twitter.com/theOfficialUNP">Twitter</a> | 
                <a href="https://www.instagram.com/theofficialunp/">Instagram</a>
              </div>
              <p class="warning">If you didn't create an account with PubShark, please ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} PubShark - University of Northern Philippines. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Registration verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending registration email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmailRegistration };