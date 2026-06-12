const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { getIo } = require('../config/socket');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
const applyLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, type, reason } = req.body;
    
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    const leave = await Leave.create({
      employee: employee._id,
      startDate,
      endDate,
      type,
      reason
    });

    // Notify HR or Managers
    getIo().emit('leaveApplied', {
      message: `${employee.firstName} applied for ${type} leave.`,
      leaveId: leave._id
    });

    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leaves (Admin/HR) or my leaves
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      query.employee = employee._id;
    }

    const leaves = await Leave.find(query).populate('employee', 'firstName lastName employeeId').sort('-createdAt');

    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject leave
// @route   PUT /api/leaves/:id/status
// @access  Private/Admin/HR
const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, managerRemark } = req.body;

    let leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) {
      res.status(404);
      throw new Error('Leave not found');
    }

    leave.status = status;
    leave.managerRemark = managerRemark;
    leave.approvedBy = req.user._id;

    // Deduct leave balance if approved
    if (status === 'Approved') {
      const days = (new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24) + 1;
      
      const employee = leave.employee;
      if (leave.type === 'Casual') employee.leaveBalance.casualLeave -= days;
      else if (leave.type === 'Sick') employee.leaveBalance.sickLeave -= days;
      else if (leave.type === 'Earned') employee.leaveBalance.earnedLeave -= days;
      
      await employee.save();
    }

    await leave.save();

    // Notify Employee
    getIo().to(leave.employee.user.toString()).emit('leaveStatusUpdate', {
      message: `Your leave has been ${status.toLowerCase()}.`,
      leaveId: leave._id,
      status
    });

    res.json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyLeave, getLeaves, updateLeaveStatus };
