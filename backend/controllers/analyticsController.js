const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private/Admin/HR
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const totalDepartments = await Department.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: 'Present'
    });

    const lateToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      isLate: true
    });

    const attendancePercentage = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;

    // Calculate trendData for the past 5 days
    const trendData = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const present = await Attendance.countDocuments({
        date: { $gte: d, $lt: nextDay },
        status: 'Present'
      });
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendData.push({ name: dayName, present, absent: totalEmployees - present });
    }

    // Calculate deptData
    const deptData = await Employee.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'deptInfo' } },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$deptInfo.name', 'Unassigned'] }, count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        presentToday,
        absentToday: totalEmployees - presentToday,
        lateToday,
        attendancePercentage: attendancePercentage.toFixed(2),
        trendData,
        deptData
      }
    });
  } catch (error) {
    next(error);
  }
};

const Leave = require('../models/Leave');

// @desc    Get detailed daily report of present, late, and on-leave employees
// @route   GET /api/analytics/daily-report
// @access  Private/Admin/HR
const getDailyReport = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // 1. Get all attendance records for today, populated with employee details
    const attendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'Present'
    }).populate({
      path: 'employee',
      select: 'firstName lastName employeeId designation profilePicture'
    });

    const present = attendanceRecords.filter(r => !r.isLate);
    const late = attendanceRecords.filter(r => r.isLate);

    // 2. Get all approved leave records overlapping with today
    const leaveRecords = await Leave.find({
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      status: 'Approved'
    }).populate({
      path: 'employee',
      select: 'firstName lastName employeeId designation profilePicture'
    });

    res.json({
      success: true,
      data: {
        present,
        late,
        leave: leaveRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated monthly report for all employees
// @route   GET /api/analytics/monthly-report
// @access  Private/Admin/HR
const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Get all active employees
    const employees = await Employee.find({ isActive: true }).select('firstName lastName employeeId designation profilePicture');

    // Get all attendance within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });

    // Get all approved leaves overlapping with the month
    const leaveRecords = await Leave.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: 'Approved'
    });

    // Build the report data per employee
    const reportData = employees.map(emp => {
      const empAttendance = attendanceRecords.filter(a => a.employee.toString() === emp._id.toString());
      
      let presentDays = 0;
      let lateDays = 0;
      let totalWorkingHours = 0;
      let overtimeHours = 0;

      empAttendance.forEach(record => {
        if (record.status === 'Present') presentDays++;
        if (record.isLate) lateDays++;
        if (record.workingHours) totalWorkingHours += record.workingHours;
        if (record.overtime) overtimeHours += record.overtime;
      });

      // Calculate leave days inside this month
      let leaveDays = 0;
      const empLeaves = leaveRecords.filter(l => l.employee.toString() === emp._id.toString());
      
      empLeaves.forEach(leave => {
        let leaveStart = leave.startDate < startDate ? startDate : leave.startDate;
        let leaveEnd = leave.endDate > endDate ? endDate : leave.endDate;
        // Count weekdays
        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) { // Ignore weekends
            leaveDays++;
          }
        }
      });

      // Generate daily breakdown
      const dailyBreakdown = [];
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(currentYear, currentMonth, day);
        const dayOfWeek = currentDate.getDay();
        const dateString = currentDate.toISOString().split('T')[0];
        
        let status = 'Absent';

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          status = 'Weekend';
        } else if (currentDate > todayDate) {
          status = '-'; // Future date
        }

        // Check if there is an attendance record
        const attRecord = empAttendance.find(a => {
          const aDate = new Date(a.date);
          return aDate.getDate() === day && aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
        });

        if (attRecord) {
          if (attRecord.status === 'Half-Day') {
            status = 'Half-Day';
          } else if (attRecord.isLate) {
            status = 'Late';
          } else {
            status = 'Present';
          }
        } else {
          // Check if there is a leave
          const isLeave = empLeaves.some(l => {
            const lStart = new Date(l.startDate);
            lStart.setHours(0,0,0,0);
            const lEnd = new Date(l.endDate);
            lEnd.setHours(23,59,59,999);
            return currentDate >= lStart && currentDate <= lEnd;
          });
          if (isLeave && status !== 'Weekend') {
            status = 'On Leave';
          }
        }

        dailyBreakdown.push({
          date: dateString,
          status,
          day: day
        });
      }

      const absentDays = dailyBreakdown.filter(d => d.status === 'Absent').length;

      return {
        _id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeId: emp.employeeId,
        designation: emp.designation,
        profilePicture: emp.profilePicture,
        presentDays,
        lateDays,
        leaveDays,
        absentDays,
        totalWorkingHours: Math.round(totalWorkingHours),
        overtimeHours: Math.round(overtimeHours),
        dailyBreakdown
      };
    });

    res.json({
      success: true,
      data: reportData,
      month: currentMonth + 1,
      year: currentYear
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardAnalytics, getDailyReport, getMonthlyReport };
