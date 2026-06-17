const express = require('express');
const router = express.Router();
const { getHolidays, createHoliday } = require('../controllers/holidayController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getHolidays).post(protect, authorize('Admin', 'HR'), createHoliday);

module.exports = router;
