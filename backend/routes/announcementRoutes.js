const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getAnnouncements)
  .post(protect, authorize('Admin'), createAnnouncement);

module.exports = router;
