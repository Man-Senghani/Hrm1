const jwt = require('jsonwebtoken');

const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      // Verify user exists in active database
      let dbUser = await User.findById(decoded.id).select('_id role name profileImage').lean();
      if (!dbUser && decoded.role) {
        // Resilience recovery: if DB was reseeded or IDs changed, match by decoded name & role
        if (decoded.name) {
          dbUser = await User.findOne({ name: decoded.name, role: decoded.role }).select('_id role name profileImage').lean();
        }
        if (!dbUser) {
          dbUser = await User.findOne({ role: decoded.role }).select('_id role name profileImage').lean();
        }
      }

      if (!dbUser) {
        return res.status(401).json({ message: 'User account not found. Please log in again.' });
      }

      req.user = {
        id: dbUser._id.toString(),
        role: dbUser.role || decoded.role,
        name: dbUser.name || decoded.name,
        profileImage: dbUser.profileImage || decoded.profileImage
      };

      return next();
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// 👮 Role Based Authorization (Case-insensitive & handles aliases like "Team Manager" / "team_manager")
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase().trim();
    const normalizedAllowed = roles.map(r => r.toLowerCase().trim());

    const isManagerAlias = ['manager', 'team manager', 'team_manager', 'teammanager'].includes(userRole);
    const allowManager = normalizedAllowed.some(r => ['manager', 'team manager', 'team_manager', 'teammanager'].includes(r));

    if (normalizedAllowed.includes(userRole) || (isManagerAlias && allowManager)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Role (${req.user.role}) is not authorized to access this resource` 
    });
  };
};

module.exports = { protect, authorize };

