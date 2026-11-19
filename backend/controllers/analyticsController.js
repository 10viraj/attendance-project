const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Leave = require('../models/Leave');
const Organization = require('../models/Organization');
const Shift = require('../models/Shift');
const mongoose = require('mongoose');

// @desc    Get dashboard analytics (optionally filtered by organization)
// @route   GET /api/analytics
// @access  Private/Admin/HR
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { organization } = req.query;

    const employeeFilter = { isActive: { $ne: false } };
    if (organization && organization !== 'all') {
      employeeFilter.organization = organization;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Fetch matching employees with relations
    const orgEmployees = await Employee.find(employeeFilter)
      .populate('department', 'name')
      .populate('organization', 'name')
      .populate('shift', 'name startTime endTime')
      .sort({ firstName: 1 });

    const totalEmployees = orgEmployees.length;
    const orgEmployeeIds = orgEmployees.map(e => e._id);

    // Count distinct departments for this organization (or all departments if 'all')
    const distinctDeptIds = [...new Set(orgEmployees.map(e => e.department?._id?.toString() || e.department?.toString()).filter(Boolean))];
    const totalDepartments = (organization && organization !== 'all')
      ? distinctDeptIds.length
      : await Department.countDocuments();

    // Attendance today filter
    const attendanceFilter = {
      date: { $gte: today, $lt: tomorrow },
      status: 'Present'
    };
    if (organization && organization !== 'all') {
      attendanceFilter.employee = { $in: orgEmployeeIds };
    }
    const presentToday = await Attendance.countDocuments(attendanceFilter);

    // Late arrivals today filter
    const lateFilter = {
      date: { $gte: today, $lt: tomorrow },
      isLate: true
    };
    if (organization && organization !== 'all') {
      lateFilter.employee = { $in: orgEmployeeIds };
    }
    const lateToday = await Attendance.countDocuments(lateFilter);

    // Approved leaves overlapping today filter
    const leaveFilter = {
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      status: 'Approved'
    };
    if (organization && organization !== 'all') {
      leaveFilter.employee = { $in: orgEmployeeIds };
    }
    const absentToday = await Leave.countDocuments(leaveFilter);

    const attendancePercentage = totalEmployees > 0
      ? ((presentToday / totalEmployees) * 100).toFixed(2)
      : '0.00';

    // Calculate trendData for the past 5 days
    const trendData = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);

      const dayFilter = {
        date: { $gte: d, $lt: nextDay },
        status: 'Present'
      };
      if (organization && organization !== 'all') {
        dayFilter.employee = { $in: orgEmployeeIds };
      }

      const present = await Attendance.countDocuments(dayFilter);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendData.push({
        name: dayName,
        present,
        absent: Math.max(0, totalEmployees - present)
      });
    }

    // Calculate deptData
    const deptMatch = { isActive: { $ne: false } };
    if (organization && organization !== 'all') {
      if (mongoose.Types.ObjectId.isValid(organization)) {
        deptMatch.organization = new mongoose.Types.ObjectId(organization);
      }
    }
    const deptData = await Employee.aggregate([
      { $match: deptMatch },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'deptInfo' } },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$deptInfo.name', 'Unassigned'] }, count: 1, _id: 0 } }
    ]);

    // Fetch today's attendance & approved leaves for the employee list
    const todayAttendanceRecords = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      employee: { $in: orgEmployeeIds }
    });

    const todayLeaveRecords = await Leave.find({
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      status: 'Approved',
      employee: { $in: orgEmployeeIds }
    });

    const employeeList = orgEmployees.map(emp => {
      const att = todayAttendanceRecords.find(a => a.employee.toString() === emp._id.toString());
      const lve = todayLeaveRecords.find(l => l.employee.toString() === emp._id.toString());
      let todayStatus = 'Absent';
      let checkInTime = null;
      let isLate = false;

      if (att) {
        todayStatus = att.status || 'Present';
        checkInTime = att.checkIn?.time || null;
        isLate = !!att.isLate;
      } else if (lve) {
        todayStatus = 'On Leave';
      }

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeId,
        department: emp.department?.name || 'Unassigned',
        departmentId: emp.department?._id || null,
        organization: emp.organization?.name || 'General',
        organizationId: emp.organization?._id || null,
        designation: emp.designation || 'Staff',
        profilePicture: emp.profilePicture,
        todayStatus,
        checkInTime,
        isLate
      };
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        presentToday,
        absentToday: absentToday || Math.max(0, totalEmployees - presentToday),
        lateToday,
        attendancePercentage,
        trendData,
        deptData,
        employees: employeeList
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed daily report of present, late, and on-leave employees
// @route   GET /api/analytics/daily-report
// @access  Private/Admin/HR
const getDailyReport = async (req, res, next) => {
  try {
    const { organization } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Filter employees by org if requested
    let orgEmployeeIds = null;
    if (organization && organization !== 'all') {
      const emps = await Employee.find({ organization }).select('_id');
      orgEmployeeIds = emps.map(e => e._id);
    }

    const attQuery = {
      date: { $gte: today, $lt: tomorrow },
      status: 'Present'
    };
    if (orgEmployeeIds) {
      attQuery.employee = { $in: orgEmployeeIds };
    }

    const attendanceRecords = await Attendance.find(attQuery).populate({
      path: 'employee',
      select: 'firstName lastName employeeId designation profilePicture organization',
      populate: { path: 'organization', select: 'name' }
    });

    const present = attendanceRecords.filter(r => !r.isLate);
    const late = attendanceRecords.filter(r => r.isLate);

    const leaveQuery = {
      startDate: { $lte: tomorrow },
      endDate: { $gte: today },
      status: 'Approved'
    };
    if (orgEmployeeIds) {
      leaveQuery.employee = { $in: orgEmployeeIds };
    }

    const leaveRecords = await Leave.find(leaveQuery).populate({
      path: 'employee',
      select: 'firstName lastName employeeId designation profilePicture organization',
      populate: { path: 'organization', select: 'name' }
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
    const { month, year, organization } = req.query;
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const empQuery = { isActive: { $ne: false } };
    if (organization && organization !== 'all') {
      empQuery.organization = organization;
    }

    // Get active employees matching organization
    const employees = await Employee.find(empQuery)
      .select('firstName lastName employeeId designation profilePicture department shift organization')
      .populate('department', 'name')
      .populate('shift', 'name')
      .populate('organization', 'name');

    const empIds = employees.map(e => e._id);

    // Get all attendance within the date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      employee: { $in: empIds }
    });

    // Get all approved leaves overlapping with the month
    const leaveRecords = await Leave.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: 'Approved',
      employee: { $in: empIds }
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

      let leaveDays = 0;
      const empLeaves = leaveRecords.filter(l => l.employee.toString() === emp._id.toString());
      
      empLeaves.forEach(leave => {
        let leaveStart = leave.startDate < startDate ? startDate : leave.startDate;
        let leaveEnd = leave.endDate > endDate ? endDate : leave.endDate;
        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) {
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
        department: emp.department ? emp.department.name : null,
        organization: emp.organization ? emp.organization.name : null,
        shift: emp.shift ? emp.shift.name : null,
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
