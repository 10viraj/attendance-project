const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { getIo } = require('../config/socket');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
const applyLeave = async (req, res, next) => {
  try {
    const { startDate, endDate, type, reason } = req.body;
    
    if (type === 'Comp Off') {
      return res.status(400).json({ success: false, message: 'Comp Off is no longer supported.' });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    // Calculate requested days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check monthly limits for Casual and Sick leaves
    if (type === 'Casual' || type === 'Sick') {
      const currentMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const currentMonthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);

      // Find all pending/approved leaves of this type in the same month
      const existingLeaves = await Leave.find({
        employee: employee._id,
        type,
        status: { $in: ['Pending', 'Approved'] },
        startDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
      });

      const usedDays = existingLeaves.reduce((total, lv) => {
        const lvDays = Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        return total + lvDays;
      }, 0);

      const limit = type === 'Casual' ? 3 : 2;
      
      if (usedDays + requestedDays > limit) {
        return res.status(400).json({ 
          success: false, 
          message: `Monthly limit exceeded for ${type} leave. You have ${limit - usedDays} day(s) remaining this month.` 
        });
      }
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

// @desc    Get current month leave balances
// @route   GET /api/leaves/balances
// @access  Private
const getLeaveBalances = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const existingLeaves = await Leave.find({
      employee: employee._id,
      status: { $in: ['Pending', 'Approved'] },
      startDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });

    let usedCasual = 0;
    let usedSick = 0;
    let usedEarned = 0;
    let usedUnpaid = 0;

    existingLeaves.forEach(lv => {
      const days = Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (lv.type === 'Casual') usedCasual += days;
      if (lv.type === 'Sick') usedSick += days;
      if (lv.type === 'Earned') usedEarned += days;
      if (lv.type === 'Unpaid') usedUnpaid += days;
    });

    res.json({
      success: true,
      data: {
        casual: { used: usedCasual, total: 3 },
        sick: { used: usedSick, total: 2 },
        earned: { used: usedEarned, total: 'N/A' },
        unpaid: { used: usedUnpaid, total: 'N/A' }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyLeave, getLeaves, updateLeaveStatus, getLeaveBalances };
