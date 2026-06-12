const express = require('express');
const router = express.Router();
const { getShifts, createShift } = require('../controllers/shiftController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getShifts)
  .post(protect, authorize('Admin'), createShift);

module.exports = router;
