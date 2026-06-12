const Shift = require('../models/Shift');

const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find();
    res.json({ success: true, data: shifts });
  } catch (error) {
    next(error);
  }
};

const createShift = async (req, res, next) => {
  try {
    const shift = await Shift.create(req.body);
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

module.exports = { getShifts, createShift };
