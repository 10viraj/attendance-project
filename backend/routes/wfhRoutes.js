const express = require('express');
const router = express.Router();
const { applyWfh, getMyWfhRequests, getAllWfhRequests, updateWfhStatus } = require('../controllers/wfhController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/').post(protect, applyWfh).get(protect, getMyWfhRequests);

// Admin routes
router.get('/admin', protect, authorize('Admin', 'HR'), getAllWfhRequests);
router.put('/admin/:id/status', protect, authorize('Admin', 'HR'), updateWfhStatus);

module.exports = router;
