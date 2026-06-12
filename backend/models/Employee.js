const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  designation: {
    type: String
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  profilePicture: {
    type: String, // URL from Cloudinary
    default: 'no-photo.jpg'
  },
  faceEmbeddings: {
    type: [Number], // Store embeddings as array of floats, or adjust depending on Python service
    select: false
  },
  leaveBalance: {
    casualLeave: { type: Number, default: 12 },
    sickLeave: { type: Number, default: 12 },
    earnedLeave: { type: Number, default: 15 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
