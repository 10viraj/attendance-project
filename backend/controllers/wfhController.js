const WfhRequest = require('../models/WfhRequest');
const Employee = require('../models/Employee');

// @desc    Apply for WFH
// @route   POST /api/wfh
// @access  Private
const applyWfh = async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const wfh = await WfhRequest.create({
      employee: employee._id,
      startDate,
      endDate,
      reason
    });

    res.status(201).json({ success: true, data: wfh });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee WFH requests
// @route   GET /api/wfh
// @access  Private
const getMyWfhRequests = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const requests = await WfhRequest.find({ employee: employee._id }).sort('-createdAt');
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all WFH requests (Admin)
// @route   GET /api/wfh/admin
// @access  Private/Admin
const getAllWfhRequests = async (req, res, next) => {
  try {
    const requests = await WfhRequest.find({})
      .populate('employee', 'firstName lastName employeeId')
      .sort('-createdAt');
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Update WFH request status (Admin)
// @route   PUT /api/wfh/admin/:id/status
// @access  Private/Admin
const updateWfhStatus = async (req, res, next) => {
  try {
    const { status, managerRemark } = req.body;
    let request = await WfhRequest.findById(req.params.id);

    if (!request) {
      res.status(404);
      throw new Error('WFH request not found');
    }

    request.status = status;
    if (managerRemark) {
      request.managerRemark = managerRemark;
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

module.exports = { applyWfh, getMyWfhRequests, getAllWfhRequests, updateWfhStatus };
