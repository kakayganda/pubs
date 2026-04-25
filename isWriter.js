const isWriter = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (req.user.role !== 'writer' ) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a writer create a post' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authorization' 
    });
  }
};

module.exports = isWriter;