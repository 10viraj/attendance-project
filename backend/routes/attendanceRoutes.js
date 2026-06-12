const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getTodayStatus, getEmployeeStats } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/today', protect, getTodayStatus);
router.get('/stats', protect, getEmployeeStats);

module.exports = router;
