const express = require('express');
const router = express.Router();
const { getOrganizations, createOrganization, updateOrganization, deleteOrganization } = require('../controllers/organizationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, getOrganizations)
  .post(protect, authorize('Admin'), createOrganization);

router.route('/:id')
  .put(protect, authorize('Admin'), updateOrganization)
  .delete(protect, authorize('Admin'), deleteOrganization);

module.exports = router;
