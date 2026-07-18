const express = require('express');
const router = express.Router();
const { exportPayroll } = require('../controllers/payrollController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/export')
  .get(protect, authorize('Admin'), exportPayroll);

module.exports = router;
