const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  // Step 1: Create Company
  name: { type: String, required: true, default: 'My Company' },
  logo: { type: String, default: '' },
  industry: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  zipCode: { type: String, default: '' },
  website: { type: String, default: '' },
  taxId: { type: String, default: '' },
  
  // Operational Details
  timezone: { type: String, default: 'UTC' },
  workingDays: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  officeStartTime: { type: String, default: '09:00' },
  officeEndTime: { type: String, default: '17:00' },
  
  // Admin Contact Details
  adminName: { type: String, default: '' },
  adminEmail: { type: String, default: '' },
  adminPhone: { type: String, default: '' },
  
  // Step 6: Set Attendance Rules
  rules: {
    standardWorkHours: { type: Number, default: 8 },
    gracePeriodMinutes: { type: Number, default: 15 },
    halfDayThresholdHours: { type: Number, default: 4 },
    annualLeaveLimit: { type: Number, default: 20 },
    sickLeaveLimit: { type: Number, default: 10 },
  }
}, { timestamps: true });

// Since there is only one organization settings document for the system,
// we can ensure only one gets created or just update the first one found.
module.exports = mongoose.model('Organization', organizationSchema);
