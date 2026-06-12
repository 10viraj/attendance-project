const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a shift name'],
    unique: true
  },
  startTime: {
    type: String, // format 'HH:mm' e.g. '09:00'
    required: true
  },
  endTime: {
    type: String, // format 'HH:mm' e.g. '18:00'
    required: true
  },
  gracePeriod: {
    type: Number, // in minutes
    default: 15
  },
  halfDayHours: {
    type: Number, // minimum hours required for a half day
    default: 4
  },
  fullDayHours: {
    type: Number, // minimum hours required for a full day
    default: 8
  }
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
