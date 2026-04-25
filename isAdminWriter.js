const isAdminWriter = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (req.user.role !== 'writer' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a writer or an admin to edit a post' 
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

module.exports = isAdminWriter;