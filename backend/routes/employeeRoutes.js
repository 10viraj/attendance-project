const express = require('express');
const router = express.Router();
const { getEmployees, getEmployee, updateEmployee, deleteEmployee, updateMyProfile, uploadProfilePicture, upload } = require('../controllers/employeeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getEmployees);

router.route('/profile')
  .put(protect, updateMyProfile);

router.route('/profile-picture')
  .post(protect, upload.single('image'), uploadProfilePicture);

router.route('/:id')
  .get(protect, getEmployee)
  .put(protect, authorize('Admin', 'HR'), updateEmployee)
  .delete(protect, authorize('Admin'), deleteEmployee);

module.exports = router;
