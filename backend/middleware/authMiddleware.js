const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      req.user = {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name,
        profileImage: decoded.profileImage
      };

      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
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

