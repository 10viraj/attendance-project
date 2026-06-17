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

module.exports = { getHolidays, createHoliday };
