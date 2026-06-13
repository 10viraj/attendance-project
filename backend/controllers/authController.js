const User = require('../models/User');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register new user & employee profile
// @route   POST /api/auth/register
// @access  Public (or Admin only depending on business rules)
const registerUser = async (req, res, next) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({ email, password, role });

    if (user) {
      // Auto-generate employeeId
      const lastEmployee = await Employee.findOne().sort({ createdAt: -1 });
      let nextIdNum = 1;
      
      if (lastEmployee && lastEmployee.employeeId && lastEmployee.employeeId.startsWith('EMP')) {
        const lastNum = parseInt(lastEmployee.employeeId.replace('EMP', ''), 10);
        if (!isNaN(lastNum)) {
          nextIdNum = lastNum + 1;
        }
      }
      
      const generatedEmployeeId = `EMP${String(nextIdNum).padStart(2, '0')}`;

      const employee = await Employee.create({
        user: user._id,
        employeeId: generatedEmployeeId,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
        employee,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      const employee = await Employee.findOne({ user: user._id });

      res.json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
        employee,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser };
