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

    await User.findByIdAndDelete(employee.user);
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
    const { firstName, lastName, phone, address } = req.body;
    
    const employee = await Employee.findOneAndUpdate(
      { user: req.user._id },
      { firstName, lastName, phone, address },
      { new: true, runValidators: true }
    );

    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    res.json({ success: true, data: employee });
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
