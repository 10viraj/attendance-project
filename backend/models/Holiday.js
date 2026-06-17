const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Company', 'Regional', 'Festival'],
    required: true
  },
  description: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
