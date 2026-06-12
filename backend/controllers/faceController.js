const Employee = require('../models/Employee');
const { mockCompareFaces } = require('../services/faceService');

// @desc    Register employee face embeddings
// @route   POST /api/face/register
// @access  Private
const registerFace = async (req, res, next) => {
  try {
    const { employeeId, embeddings } = req.body; // In real app, this might be a photo file that a Python service converts to embeddings

    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { faceEmbeddings: embeddings },
      { new: true }
    );

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    res.json({ success: true, message: 'Face registered successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify employee face
// @route   POST /api/face/verify
// @access  Private
const verifyFace = async (req, res, next) => {
  try {
    const { employeeId, capturedEmbeddings } = req.body;

    const employee = await Employee.findOne({ employeeId }).select('+faceEmbeddings');
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    if (!employee.faceEmbeddings || employee.faceEmbeddings.length === 0) {
      res.status(400);
      throw new Error('Face not registered for this employee');
    }

    const isMatch = mockCompareFaces(employee.faceEmbeddings, capturedEmbeddings);

    if (isMatch) {
      res.json({ success: true, message: 'Face verified successfully' });
    } else {
      res.status(401);
      throw new Error('Face verification failed');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { registerFace, verifyFace };
