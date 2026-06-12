const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment } = require('../controllers/departmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getDepartments)
  .post(protect, authorize('Admin'), createDepartment);

module.exports = router;
