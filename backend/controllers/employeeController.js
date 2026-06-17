const Employee = require('../models/Employee');
const User = require('../models/User');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private/HR or Admin
const getEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { employeeId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('user', 'email role')
      .populate('department', 'name')
      .populate('shift', 'name startTime endTime')
      .skip(startIndex)
      .limit(limit);

    res.json({
      success: true,
      count: employees.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: employees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'email role')
      .populate('department')
      .populate('shift');

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee details
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    // Import models inline to avoid circular dependencies if any, or just at top. Let's require them here safely.
    const Attendance = require('../models/Attendance');
    const Leave = require('../models/Leave');

    // Delete associated User account
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }
    
    // Delete all attendance records for this employee
    await Attendance.deleteMany({ employee: req.params.id });
    
    // Delete all leave records for this employee
    await Leave.deleteMany({ employee: req.params.id });

    // Finally delete the employee profile
    await Employee.findByIdAndDelete(req.params.id);

    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current employee profile
// @route   PUT /api/employees/profile
// @access  Private
const updateMyProfile = async (req, res, next) => {
  try {
    // Restrict what fields can be updated
    const { firstName, lastName, phone, address, email } = req.body;
    
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;

    const employee = await Employee.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateFields },
      { new: true } // runValidators: false allows partial/empty updates if desired
    );

    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }
    
    let updatedUser = req.user;
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400);
        throw new Error('Email already in use');
      }
      updatedUser = await User.findByIdAndUpdate(req.user._id, { email }, { new: true });
    }

    res.json({ success: true, data: employee, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  updateMyProfile
};
