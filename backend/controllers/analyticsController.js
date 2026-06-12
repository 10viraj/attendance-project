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

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        presentToday,
        absentToday: totalEmployees - presentToday,
        lateToday,
        attendancePercentage: attendancePercentage.toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardAnalytics };
