const express = require('express');
const router = express.Router();
const { getShifts, createShift, updateShift, deleteShift } = require('../controllers/shiftController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getShifts)
  .post(protect, authorize('Admin'), createShift);

router.route('/:id')
  .put(protect, authorize('Admin'), updateShift)
  .delete(protect, authorize('Admin'), deleteShift);

module.exports = router;
