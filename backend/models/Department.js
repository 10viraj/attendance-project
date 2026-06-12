const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a department name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee' // Head of Department
  }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
