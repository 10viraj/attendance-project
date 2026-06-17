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

const seedShifts = async (req, res, next) => {
  try {
    const defaultShifts = [
      { name: 'Morning Shift', startTime: '09:00', endTime: '18:00' },
      { name: 'Evening Shift', startTime: '14:00', endTime: '23:00' },
      { name: 'Night Shift', startTime: '22:00', endTime: '07:00' },
      { name: 'Flexible Shift', startTime: '10:00', endTime: '19:00', gracePeriod: 120 }
    ];
    for (const s of defaultShifts) {
      await Shift.findOneAndUpdate({ name: s.name }, s, { upsert: true, new: true });
    }
    res.json({ success: true, message: 'Shifts seeded successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getShifts, createShift, seedShifts };
