const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus, getLeaveBalances, updateLeave, deleteLeave, getLeaveBalanceReport } = require('../controllers/leaveController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/balances')
  .get(protect, getLeaveBalances);

router.route('/report')
  .get(protect, getLeaveBalanceReport);

router.route('/')
  .post(protect, applyLeave)
  .get(protect, getLeaves);

router.route('/:id')
  .put(protect, updateLeave)
  .delete(protect, deleteLeave);

router.route('/:id/status')
  .put(protect, authorize('Admin', 'HR'), updateLeaveStatus);

module.exports = router;
