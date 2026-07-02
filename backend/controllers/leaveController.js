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

    let available = 0;
    if (type === 'Casual') available = employee.leaveBalance.casualLeave;
    else if (type === 'Sick') available = employee.leaveBalance.sickLeave;
    else if (type === 'Earned') available = employee.leaveBalance.earnedLeave;
    
    if (type !== 'Unpaid') {
      const pendingLeaves = await Leave.find({
        employee: employee._id,
        type,
        status: 'Pending'
      });
      const pendingDays = pendingLeaves.reduce((total, lv) => {
        return total + Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      if (requestedDays + pendingDays > available) {
        return res.status(400).json({ 
          success: false, 
          message: `Limit exceeded. You only have ${available - pendingDays} ${type} leave(s) available.` 
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

    const allLeaves = await Leave.find({
      employee: employee._id,
      status: { $in: ['Pending', 'Approved'] }
    });

    let usedCasual = 0, usedSick = 0, usedEarned = 0, usedUnpaid = 0;
    let approvedCasual = 0, approvedSick = 0, approvedEarned = 0;

    allLeaves.forEach(lv => {
      const days = Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      if (lv.type === 'Casual') {
        usedCasual += days;
        if (lv.status === 'Approved') approvedCasual += days;
      }
      else if (lv.type === 'Sick') {
        usedSick += days;
        if (lv.status === 'Approved') approvedSick += days;
      }
      else if (lv.type === 'Earned') {
        usedEarned += days;
        if (lv.status === 'Approved') approvedEarned += days;
      }
      else if (lv.type === 'Unpaid') {
        usedUnpaid += days;
      }
    });

    res.json({
      success: true,
      data: {
        casual: { used: usedCasual, total: employee.leaveBalance.casualLeave + approvedCasual },
        sick: { used: usedSick, total: employee.leaveBalance.sickLeave + approvedSick },
        earned: { used: usedEarned, total: employee.leaveBalance.earnedLeave + approvedEarned },
        unpaid: { used: usedUnpaid, total: 'N/A' }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a leave
// @route   PUT /api/leaves/:id
// @access  Private
const updateLeave = async (req, res, next) => {
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

    let leave = await Leave.findById(req.params.id);
    if (!leave) {
      res.status(404);
      throw new Error('Leave not found');
    }

    if (leave.employee.toString() !== employee._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this leave');
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Can only update pending leaves' });
    }

    let available = 0;
    if (type === 'Casual') available = employee.leaveBalance.casualLeave;
    else if (type === 'Sick') available = employee.leaveBalance.sickLeave;
    else if (type === 'Earned') available = employee.leaveBalance.earnedLeave;

    if (type !== 'Unpaid') {
      const pendingLeaves = await Leave.find({
        employee: employee._id,
        type,
        status: 'Pending',
        _id: { $ne: leave._id }
      });
      const pendingDays = pendingLeaves.reduce((total, lv) => {
        return total + Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      if (requestedDays + pendingDays > available) {
        return res.status(400).json({ 
          success: false, 
          message: `Limit exceeded. You only have ${available - pendingDays} ${type} leave(s) available.` 
        });
      }
    }

    leave.startDate = startDate;
    leave.endDate = endDate;
    leave.type = type;
    leave.reason = reason;

    await leave.save();

    res.json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a leave
// @route   DELETE /api/leaves/:id
// @access  Private
const deleteLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      res.status(404);
      throw new Error('Leave not found');
    }

    if (leave.employee.toString() !== employee._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this leave');
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Can only delete pending leaves' });
    }

    await leave.deleteOne();

    res.json({ success: true, message: 'Leave removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregate leave balance report for Excel export
// @route   GET /api/leaves/report
// @access  Private
const getLeaveBalanceReport = async (req, res, next) => {
  try {
    let empQuery = {};
    if (req.user.role === 'Employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      empQuery._id = emp._id;
    }

    const employees = await Employee.find(empQuery).populate('department', 'name');
    
    const allLeaves = await Leave.find({
      employee: { $in: employees.map(e => e._id) },
      status: 'Approved'
    }).sort('-startDate');

    const reportData = employees.map(emp => {
      const empLeaves = allLeaves.filter(l => l.employee.toString() === emp._id.toString());
      
      let usedCL = 0, usedSL = 0, usedEL = 0, usedUnpaid = 0;
      let lastLeaveReason = '-';
      let lastLeaveType = '-';
      
      if (empLeaves.length > 0) {
        lastLeaveReason = empLeaves[0].reason || '-';
        lastLeaveType = empLeaves[0].type || '-';
      }

      empLeaves.forEach(lv => {
        const days = Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        if (lv.type === 'Casual') usedCL += days;
        if (lv.type === 'Sick') usedSL += days;
        if (lv.type === 'Earned') usedEL += days;
        if (lv.type === 'Unpaid') usedUnpaid += days;
      });

      const totalCL = emp.leaveBalance?.casualLeave || 8;
      const totalSL = emp.leaveBalance?.sickLeave || 8;
      const totalEL = emp.leaveBalance?.earnedLeave || 14;

      return {
        empId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department ? emp.department.name : 'N/A',
        designation: emp.designation || 'N/A',
        clAllocated: totalCL,
        slAllocated: totalSL,
        elAllocated: totalEL,
        clUsed: usedCL,
        slUsed: usedSL,
        elUsed: usedEL,
        clLeft: Math.max(0, totalCL - usedCL),
        slLeft: Math.max(0, totalSL - usedSL),
        elLeft: Math.max(0, totalEL - usedEL),
        used: usedCL + usedSL + usedEL + usedUnpaid,
        total: totalCL + totalSL + totalEL,
        status: emp.isActive ? 'Active' : 'Inactive',
        lastLeaveType,
        lastLeaveReason
      };
    });

    res.json({ success: true, data: reportData });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyLeave, getLeaves, updateLeaveStatus, getLeaveBalances, updateLeave, deleteLeave, getLeaveBalanceReport };
