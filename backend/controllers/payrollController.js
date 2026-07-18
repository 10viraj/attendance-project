const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { parse } = require('json2csv');

// @desc    Export payroll CSV
// @route   GET /api/payroll/export
// @access  Private/Admin
const exportPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Please provide month and year' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employees = await Employee.find({ role: { $ne: 'Admin' } }).populate('department', 'name');
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const reportData = employees.map(emp => {
      const empAttendance = attendanceRecords.filter(a => a.employeeId.toString() === emp._id.toString());
      
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let totalHours = 0;
      let leaveDays = 0;

      empAttendance.forEach(record => {
        if (record.status === 'Present') presentDays++;
        if (record.status === 'Absent') absentDays++;
        if (record.isLate) lateDays++;
        if (record.workingHours) totalHours += record.workingHours;
      });

      return {
        'Employee ID': emp.employeeId,
        'Name': `${emp.firstName} ${emp.lastName}`,
        'Department': emp.department ? emp.department.name : 'N/A',
        'Present Days': presentDays,
        'Absent Days': absentDays,
        'Late Days': lateDays,
        'Total Hours': totalHours.toFixed(1),
        'Base Salary': emp.salary || 0,
      };
    });

    const fields = ['Employee ID', 'Name', 'Department', 'Present Days', 'Absent Days', 'Late Days', 'Total Hours', 'Base Salary'];
    const opts = { fields };
    
    const csv = parse(reportData, opts);
    
    res.setHeader('Content-disposition', `attachment; filename=payroll_${month}_${year}.csv`);
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};

module.exports = { exportPayroll };
