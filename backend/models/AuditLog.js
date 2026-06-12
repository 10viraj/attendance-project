const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true // e.g. 'CREATE_EMPLOYEE', 'UPDATE_SHIFT', 'DELETE_DEPARTMENT'
  },
  resource: {
    type: String,
    required: true // e.g. 'Employee', 'Shift', 'Settings'
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId // Optional reference to the item changed
  },
  details: {
    type: Object // Store previous/new state if needed
  },
  ipAddress: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
