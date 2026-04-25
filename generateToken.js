const jwt = require('jsonwebtoken');
const User = require('../model/user.model');
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const generateToken = async (userId) => {
  try {
    const user = await User.findById(userId).select('_id email role username');

    if (!user) {
      throw new Error('User not found');
    }

    // Include more user info in the token payload
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      iat: Date.now() // issued at timestamp
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      algorithm: 'HS256'
    });

    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

module.exports = generateToken;
