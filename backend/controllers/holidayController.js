const Holiday = require('../models/Holiday');

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Private
const getHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find().sort('date');
    res.json({ success: true, data: holidays });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a holiday
// @route   POST /api/holidays
// @access  Private/Admin
const createHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json({ success: true, data: holiday });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private/Admin
const updateHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }
    res.json({ success: true, data: holiday });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private/Admin
const deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }
    await holiday.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday };
