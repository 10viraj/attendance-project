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

    // Check if already checked in today and not yet checked out
    let openAttendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      'checkOut.time': { $exists: false }
    });

    if (openAttendance) {
      res.status(400);
      throw new Error('Already checked in. Please check out first.');
    }

    const currentTime = new Date();
    let isLate = false;
    let status = 'Present';

    // 10:00 am after late consider 1:00 pm after consider half day
    const tenAM = new Date();
    tenAM.setHours(10, 0, 0, 0);

    const onePM = new Date();
    onePM.setHours(13, 0, 0, 0);

    if (currentTime > onePM) {
      status = 'Half-Day';
    } else if (currentTime > tenAM) {
      isLate = true;
    }

    const attendance = await Attendance.create({
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
      status,
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
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      res.status(400);
      throw new Error('No open check-in record found to check out');
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
    let workedHours = getDifferenceInHours(attendance.checkIn.time, currentTime);

    // Deduct total break hours
    let totalBreakMinutes = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach(b => {
        if (b.durationMinutes) {
          totalBreakMinutes += b.durationMinutes;
        } else if (b.startTime && !b.endTime) {
          // If break wasn't explicitly ended, close it now
          const duration = Math.round((currentTime - b.startTime) / (1000 * 60));
          b.endTime = currentTime;
          b.durationMinutes = duration;
          totalBreakMinutes += duration;
        }
      });
    }

    const breakHours = totalBreakMinutes / 60;
    workedHours = Math.max(0, workedHours - breakHours);

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
    }).sort({ 'checkIn.time': -1 });

    if (!attendance) {
      return res.json({ success: true, status: 'Not Checked In' });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      // They have already completed their shift for today
      return res.json({ success: true, status: 'Checked Out', data: attendance });
    }

    // Check if on break
    const activeBreak = attendance.breaks?.find(b => !b.endTime);
    if (activeBreak) {
      return res.json({ success: true, status: 'On Break', data: attendance });
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
    const employee = await Employee.findOne({ user: req.user._id }).populate('shift');
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
        presentDays: presentDaysThisMonth,
        absentDays: Math.max(0, weekdaysPassed - presentDaysThisMonth),
        weeklyHoursFormatted: `${hours}h ${minutes}m`,
        shiftName: employee.shift ? employee.shift.name : 'Standard Shift',
        shiftTime: employee.shift ? `${employee.shift.startTime} - ${employee.shift.endTime}` : '09:00 - 18:00'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee attendance history
// @route   GET /api/attendance/history
// @access  Private
const getHistory = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee profile not found');
    }

    const history = await Attendance.find({ employee: employee._id })
      .sort({ date: -1 })
      .limit(30); // Return last 30 days for performance

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance history for a specific employee
// @route   GET /api/attendance/admin/employee/:employeeId
// @access  Private/Admin
const getEmployeeHistory = async (req, res, next) => {
  try {
    const history = await Attendance.find({ employee: req.params.employeeId })
      .sort({ date: -1 })
      .limit(30);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start a break
// @route   POST /api/attendance/start-break
// @access  Private
const startBreak = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      res.status(400);
      throw new Error('You must be checked in to start a break');
    }

    // Check if a break is already active
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
      res.status(400);
      throw new Error('You are already on a break');
    }

    attendance.breaks.push({
      startTime: new Date()
    });

    await attendance.save();

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// @desc    End a break
// @route   POST /api/attendance/end-break
// @access  Private
const endBreak = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      res.status(400);
      throw new Error('Attendance record not found or already checked out');
    }

    const activeBreakIndex = attendance.breaks.findIndex(b => !b.endTime);
    if (activeBreakIndex === -1) {
      res.status(400);
      throw new Error('No active break found');
    }

    const endTime = new Date();
    const startTime = attendance.breaks[activeBreakIndex].startTime;
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    attendance.breaks[activeBreakIndex].endTime = endTime;
    attendance.breaks[activeBreakIndex].durationMinutes = durationMinutes;

    await attendance.save();

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, getTodayStatus, getEmployeeStats, getHistory, getEmployeeHistory, startBreak, endBreak };
