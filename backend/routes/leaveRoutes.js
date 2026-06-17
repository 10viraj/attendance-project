const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus, getLeaveBalances } = require('../controllers/leaveController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/balances')
  .get(protect, getLeaveBalances);

router.route('/')
  .post(protect, applyLeave)
  .get(protect, getLeaves);

router.route('/:id/status')
  .put(protect, authorize('Admin', 'HR'), updateLeaveStatus);

module.exports = router;
