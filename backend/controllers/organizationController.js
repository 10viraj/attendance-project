const Organization = require('../models/Organization');

// @desc    Get all organizations
// @route   GET /api/organization
// @access  Private
const getOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json({ success: true, count: orgs.length, data: orgs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new organization
// @route   POST /api/organization
// @access  Private/Admin
const createOrganization = async (req, res, next) => {
  try {
    const org = await Organization.create(req.body);
    res.status(201).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization settings
// @route   PUT /api/organization/:id
// @access  Private/Admin
const updateOrganization = async (req, res, next) => {
  try {
    let org = await Organization.findById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const fields = [
      'name', 'logo', 'industry', 'email', 'phone', 'address', 'city', 'state', 'country', 'zipCode',
      'website', 'taxId', 'timezone', 'workingDays', 'officeStartTime', 'officeEndTime',
      'adminName', 'adminEmail', 'adminPhone'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        org[field] = req.body[field];
      }
    });
    
    if (req.body.rules) {
      org.rules = { ...org.rules, ...req.body.rules };
    }
    
    await org.save();
    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete organization
// @route   DELETE /api/organization/:id
// @access  Private/Admin
const deleteOrganization = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    await org.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOrganizations, createOrganization, updateOrganization, deleteOrganization };
