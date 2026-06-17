const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
         console.error('Auth Error: User not found for id', decoded.id);
      }
      return next();
    } catch (error) {
      console.error('Auth Error: jwt verify or findById failed', error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    console.error('Auth Error: No token provided');
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`User role ${req.user.role} is not authorized to access this route`));
    }
    next();
  };
};

module.exports = { protect, authorize };
