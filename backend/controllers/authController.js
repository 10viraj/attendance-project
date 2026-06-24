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
    const { email, password, role, firstName, lastName, department } = req.body;

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
        lastName,
        department: department || undefined
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

const updatePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.expoPushToken = token;
    await user.save();

    res.status(200).json({ success: true, message: 'Push token updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide both current and new passwords');
    }

    // Select +password because it's disabled by default in the model
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(401);
      throw new Error('Incorrect current password');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  updatePushToken,
  updatePassword
};
