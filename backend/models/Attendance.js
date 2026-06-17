const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    verificationMethod: {
      type: String,
      enum: ['QR', 'Face', 'Fingerprint', 'Manual'],
      required: true
    },
    photoUrl: String // In case of face verification fallback
  },
  checkOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      }
    },
    verificationMethod: {
      type: String,
      enum: ['QR', 'Face', 'Fingerprint', 'Manual']
    }
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day', 'On-Leave', 'Week-Off'],
    default: 'Absent'
  },
  workingHours: {
    type: Number, // Total hours worked today
    default: 0
  },
  overtime: {
    type: Number, // Overtime in hours
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  isEarlyExit: {
    type: Boolean,
    default: false
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    durationMinutes: Number
  }],
  workType: {
    type: String,
    enum: ['Office', 'WFH', 'Client Site'],
    default: 'Office'
  }
}, { timestamps: true });

// Compound index to ensure one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
