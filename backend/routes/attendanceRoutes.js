const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getTodayStatus, getEmployeeStats, getHistory, getEmployeeHistory, startBreak, endBreak } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.post('/start-break', protect, startBreak);
router.post('/end-break', protect, endBreak);
router.get('/today', protect, getTodayStatus);
router.get('/stats', protect, getEmployeeStats);
router.get('/history', protect, getHistory);
router.get('/admin/employee/:employeeId', protect, authorize('Admin', 'HR'), getEmployeeHistory);

module.exports = router;
