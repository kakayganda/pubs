const express = require('express');

const User = require('../model/user.model');
const generateToken = require('../middleware/generateToken');

const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

const cloudinary = require('../utils/cloudinaryConfig.js');
const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

const bcrypt = require('bcrypt');



const OTP = require('../model/otp.model');
const { sendOTPEmailPasswordReset } = require('../utils/emailServicePasswordReset');
const { sendOTPEmailRegistration } = require('../utils/emailServiceRegistration');

const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);

// register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validate required fields
    if (!email || !password || !username) {
      return res.status(400).json({
        message: 'Email, password, and username are required'
      });
    }

    // Check for existing email and username
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          message: 'User with this email already exists'
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          message: 'Username is already taken'
        });
      }
    }

    // Create and save new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      username
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User registered successfully!",
      user: userResponse
    });

  } catch (error) {
    console.error("Failed to register:", error);

    // Better error handling for MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Check if user exists by email or username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });

    if(!user) {
      return res.status(404).send({ message: "User not found!" })
    }

    const isMatch = await user.comparePassword(password)

    if(!isMatch) {
      return res.status(401).send({message: 'Invalid password!'})
    }

    const token = await generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: true
    })

    res.status(200).send({ message:"Login success!", token, user: {
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role
    }})

  } catch (error) {
    console.error("Failed to login", error);
    res.status(500).json({ message: 'Login failed!' })
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie('token');
    res.status(200).send({ message: 'Logout success!' })
  } catch (error) {
    console.error("Failed to log out", error);
    res.status(500).json({ message: 'Logout failed!' })
  }
})

// get all users
router.get('/users', async (req, res) => {
  try {
    // Remove the field restriction and get all user fields
    const users = await User.find()
                           .select('_id email username role')
                           .lean(); // Added lean() for better performance

    console.log('Users being sent from backend:', users); // Debug log
    res.status(200).send({message: "Users retrieved successfully", users});
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: 'Failed to fetch users!' })
  }
});

// Current user route
router.get('/current-user', verifyToken, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        email: req.user.email,
        username: req.user.username, // Add this line
        role: req.user.role,
        profileImg: req.user.profileImg || null
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current user'
    });
  }
});

// delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const user = await User.findByIdAndDelete(id);

    if(!user) {
      return res.status(404).send({ message: "User not found!" })
    }

    res.status(200).send({ message: "User  deleted successfully" })

  } catch (error) {
    console.error("Error deleting user", error);
    res.status(500).json({ message: 'Failed to delete user!' })
  }
})

// update user role
router.put('/users/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const {role, username} = req.body;
    const updateData = {};

    if (role) updateData.role = role;
    if (username) updateData.username = username;

    const user = await User.findByIdAndUpdate(id, updateData, {new: true});
    if(!user) {
      return res.status(404).send({ message: "User not found" })
    }

    res.status(200).send({ message: "User updated successfully!", user });

  } catch (error) {
    console.error("Error updating user", error);
    res.status(500).json({ message: 'Error updating user!' })
  }
});

// Generate and send OTP (Email Registration)
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.findOneAndDelete({ email }); // Remove any existing OTP
    await new OTP({ email, otp }).save();

    // Send OTP via email
    await sendOTPEmailRegistration(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Failed to send OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Generate and send OTP (Password Reset)
router.post('/reset-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.findOneAndDelete({ email }); // Remove any existing OTP
    await new OTP({ email, otp }).save();

    // Send OTP via email
    await sendOTPEmailPasswordReset(email, otp);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Failed to send OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await OTP.deleteOne({ email }); // Delete used OTP
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Verify OTP and allow password reset
router.post('/reset-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await OTP.deleteOne({ email }); // Delete used OTP
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Reset password
router.post('/reset-password/new-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save(); // This will trigger the pre-save hook to hash the password

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.findOneAndDelete({ email }); // Remove any existing OTP
    await new OTP({ email, otp }).save();

    // Send OTP via email
    await sendOTPEmailRegistration(email, otp);

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Failed to resend OTP:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

// Update Profile
router.put('/update-profile', verifyToken, upload.single('profileImg'), async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password if updating password
    if (newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    // Handle profile image upload
    if (req.file) {
      try {
        // If user already has a profile image, delete the old one
        if (user.profileImg) {
          const publicId = user.profileImg.split('/').pop().split('.')[0];
          try {
            await cloudinary.uploader.destroy(`profile_images/${publicId}`);
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError);
            // Continue even if deletion fails
          }
        }

        // Convert buffer to base64
        const fileStr = req.file.buffer.toString('base64');
        const fileType = req.file.mimetype;
        const uploadStr = `data:${fileType};base64,${fileStr}`;

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
          folder: 'profile_images',
          transformation: [
            { width: 500, height: 500, crop: "fill" },
            { quality: "auto:best" },
            { fetch_format: "auto" }
          ]
        });

        user.profileImg = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload profile image' });
      }
    } else if (req.body.removeProfileImg === 'true') {
      // Handle profile image removal
      if (user.profileImg) {
        const publicId = user.profileImg.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        } catch (deleteError) {
          console.error('Error deleting image:', deleteError);
        }
      }
    }

    // Update other fields
    if (username) user.username = username;
    if (email) user.email = email;

    if (user.profileImg) {
      console.log('Profile image saved to database:', user.profileImg);
    }

    console.log('About to save user with profileImg:', user.profileImg);

    try {
      await user.save();
      console.log('User saved successfully with profileImg:', user.profileImg);
    } catch (error) {
      console.error('Error saving user:', error);
      return res.status(500).json({ message: 'Failed to save user data' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImg: user.profileImg, // This should now be the Cloudinary URL
        role: user.role
      }
    });
  } catch (error) {
    console.error('Failed to update profile:', error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// user.route.js
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Error fetching admins' });
  }
});

router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    res.status(200).json({ exists: !!user });
  } catch (error) {
    console.error('Failed to check email:', error);
    res.status(500).json({ message: 'Failed to check email' });
  }
});

// Validate email endpoint
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        isValid: false,
        message: 'Email is required'
      });
    }

    // Check if email already exists in your database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({
        isValid: false,
        message: 'This email is already registered'
      });
    }

    // Check for disposable email domains (more comprehensive list on backend)
    const disposableDomains = [
      'tempmail.com', 'temp-mail.org', 'fakeinbox.com', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', '10minutemail.com', 'throwawaymail.com',
      // Add more disposable domains here
    ];

    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain.toLowerCase())) {
      return res.status(200).json({
        isValid: false,
        message: 'Please use a non-disposable email address'
      });
    }

    // Validate domain has MX records (real email server)
    try {
      const mxRecords = await resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(200).json({
          isValid: false,
          message: 'Email domain appears to be invalid'
        });
      }
    } catch (error) {
      return res.status(200).json({
        isValid: false,
        message: 'Email domain appears to be invalid'
      });
    }

    // Email passed all validation checks
    res.status(200).json({
      isValid: true,
      message: 'Email is valid'
    });

  } catch (error) {
    console.error('Failed to validate email:', error);
    res.status(500).json({
      isValid: false,
      message: 'Failed to validate email'
    });
  }
});

// In users.route.js
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, '_id username email');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

router.post('/verify-admin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate request body
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Admin verification successful
    return res.status(200).json({
      success: true,
      message: 'Admin verification successful',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const user = await User.findOne({ username });

    res.status(200).json({ exists: !!user });
  } catch (error) {
    console.error('Failed to check username:', error);
    res.status(500).json({ message: 'Failed to check username' });
  }
});

module.exports = router;
