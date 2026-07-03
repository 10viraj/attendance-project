const Shift = require('../models/Shift');
const Employee = require('../models/Employee');

const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find().lean();
    const employees = await Employee.find({ shift: { $ne: null } }, '_id shift');
    
    const shiftsWithEmployees = shifts.map(shift => {
      const assignedEmps = employees.filter(emp => emp.shift.toString() === shift._id.toString());
      return { ...shift, employeeIds: assignedEmps.map(emp => emp._id) };
    });
    
    res.json({ success: true, data: shiftsWithEmployees });
  } catch (error) {
    next(error);
  }
};

const createShift = async (req, res, next) => {
  try {
    const { employeeIds, ...shiftData } = req.body;
    const shift = await Shift.create(shiftData);
    
    if (employeeIds && Array.isArray(employeeIds)) {
      await Employee.updateMany({ _id: { $in: employeeIds } }, { shift: shift._id });
    }
    
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

const updateShift = async (req, res, next) => {
  try {
    const { employeeIds, ...shiftData } = req.body;
    const shift = await Shift.findByIdAndUpdate(req.params.id, shiftData, {
      new: true,
      runValidators: true
    });
    
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    
    if (employeeIds && Array.isArray(employeeIds)) {
      // Unassign employees who were previously on this shift but not in the new list
      // Or just clear all from this shift, and assign the new ones.
      await Employee.updateMany({ shift: shift._id }, { shift: null });
      if (employeeIds.length > 0) {
        await Employee.updateMany({ _id: { $in: employeeIds } }, { shift: shift._id });
      }
    }
    
    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, data: {} });
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

module.exports = { getShifts, createShift, updateShift, deleteShift, seedShifts };
