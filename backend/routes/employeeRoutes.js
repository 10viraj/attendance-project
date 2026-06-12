const express = require('express');
const router = express.Router();
const { getEmployees, getEmployee, updateEmployee, deleteEmployee, updateMyProfile } = require('../controllers/employeeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getEmployees);

router.route('/profile')
  .put(protect, updateMyProfile);

router.route('/:id')
  .get(protect, getEmployee)
  .put(protect, authorize('Admin', 'HR'), updateEmployee)
  .delete(protect, authorize('Admin'), deleteEmployee);

module.exports = router;
