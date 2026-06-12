const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const { getIo } = require('../config/socket');

// Helper to calculate hours
const getDifferenceInHours = (start, end) => {
  return (end - start) / (1000 * 60 * 60);
};

// @desc    Check-In an employee
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res, next) => {
  try {
    const { employeeId, location, verificationMethod, photoUrl } = req.body;
    
    // Find employee to get shift details
    const employee = await Employee.findOne({ employeeId }).populate('shift');
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (attendance) {
      res.status(400);
      throw new Error('Already checked in for today');
    }

    const currentTime = new Date();
    let isLate = false;

    // Check if late based on shift start time + grace period
    if (employee.shift) {
      const [hours, minutes] = employee.shift.startTime.split(':');
      const expectedStartTime = new Date();
      expectedStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const lateThreshold = new Date(expectedStartTime.getTime() + employee.shift.gracePeriod * 60000);
      if (currentTime > lateThreshold) {
        isLate = true;
      }
    }

    attendance = await Attendance.create({
      employee: employee._id,
      date: today,
      checkIn: {
        time: currentTime,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        verificationMethod,
        photoUrl
      },
      status: 'Present',
      isLate
    });

    // Notify HR/Admin in real-time
    getIo().emit('attendanceUpdate', {
      message: `${employee.firstName} ${employee.lastName} checked in.`,
      employeeId: employee.employeeId,
      time: currentTime
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-Out an employee
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res, next) => {
  try {
    const { employeeId, location, verificationMethod } = req.body;

    const employee = await Employee.findOne({ employeeId }).populate('shift');
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (!attendance) {
      res.status(400);
      throw new Error('No check-in record found for today');
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      res.status(400);
      throw new Error('Already checked out for today');
    }

    const currentTime = new Date();
    attendance.checkOut = {
      time: currentTime,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      verificationMethod
    };

    // Calculate working hours
    const workedHours = getDifferenceInHours(attendance.checkIn.time, currentTime);
    attendance.workingHours = workedHours;

    // Check early exit and overtime
    if (employee.shift) {
      const [endHours, endMinutes] = employee.shift.endTime.split(':');
      const expectedEndTime = new Date();
      expectedEndTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      if (currentTime < expectedEndTime) {
        attendance.isEarlyExit = true;
      } else {
        const fullDayHours = employee.shift.fullDayHours || 8;
        if (workedHours > fullDayHours) {
          attendance.overtime = workedHours - fullDayHours;
        }
      }
    }

    await attendance.save();

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee attendance status for today
// @route   GET /api/attendance/today
// @access  Private
const getTodayStatus = async (req, res, next) => {
  try {
    // req.user contains the authenticated user (from protect middleware)
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (!attendance) {
      return res.json({ success: true, status: 'Not Checked In' });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.json({ success: true, status: 'Checked Out', data: attendance });
    }

    return res.json({ success: true, status: 'Checked In', data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee specific stats (weekly hours, monthly attendance)
// @route   GET /api/attendance/stats
// @access  Private
const getEmployeeStats = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    const now = new Date();
    
    // 1. Calculate Monthly Attendance Percentage
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count weekdays passed in the current month
    let weekdaysPassed = 0;
    for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) { // 0=Sun, 6=Sat
        weekdaysPassed++;
      }
    }

    const presentDaysThisMonth = await Attendance.countDocuments({
      employee: employee._id,
      date: { $gte: startOfMonth, $lte: now },
      status: 'Present'
    });

    const attendancePercentage = weekdaysPassed > 0 
      ? Math.round((presentDaysThisMonth / weekdaysPassed) * 100) 
      : 100; // Default to 100% if month just started or no weekdays passed yet

    // 2. Calculate Hours This Week
    const currentDay = now.getDay(); // 0 is Sunday
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekRecords = await Attendance.find({
      employee: employee._id,
      date: { $gte: startOfWeek, $lte: now }
    });

    let totalHours = 0;
    thisWeekRecords.forEach(record => {
      if (record.workingHours) {
        totalHours += record.workingHours;
      }
    });

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    res.json({
      success: true,
      data: {
        attendancePercentage,
        weeklyHoursFormatted: `${hours}h ${minutes}m`
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, getTodayStatus, getEmployeeStats };
