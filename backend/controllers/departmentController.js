const Department = require('../models/Department');

const getDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find().populate('manager', 'firstName lastName');
    res.json({ success: true, data: depts });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDepartments, createDepartment };
