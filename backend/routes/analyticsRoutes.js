const express = require('express');
const router = express.Router();
const { getDashboardAnalytics, getDailyReport, getMonthlyReport } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize('Admin', 'HR'), getDashboardAnalytics);
router.get('/daily-report', protect, authorize('Admin', 'HR'), getDailyReport);
router.get('/monthly-report', protect, authorize('Admin', 'HR'), getMonthlyReport);

module.exports = router;
