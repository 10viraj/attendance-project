const Document = require('../models/Document');
const Employee = require('../models/Employee');

// @desc    Get my documents
// @route   GET /api/documents/my-documents
// @access  Private (Employee)
exports.getMyDocuments = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const documents = await Document.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Upload new document
// @route   POST /api/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const { title, type, employeeId } = req.body;
    let targetEmployeeId = null;

    if (req.user.role === 'Admin' && employeeId) {
      const emp = await Employee.findById(employeeId);
      if (emp) targetEmployeeId = emp._id;
    } else {
      const employee = await Employee.findOne({ user: req.user.id });
      if (employee) targetEmployeeId = employee._id;
    }

    if (!targetEmployeeId) {
      return res.status(404).json({ success: false, message: 'Target employee not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    // Using local multer path
    const fileUrl = `/uploads/${req.file.filename}`;

    const document = await Document.create({
      title,
      type,
      url: fileUrl,
      employee: targetEmployeeId,
      uploadedBy: req.user.id
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
