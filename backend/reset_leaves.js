const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance').then(async () => {
  console.log('Connected to MongoDB');
  
  const result = await Employee.updateMany({}, {
    $set: {
      'leaveBalance.casualLeave': 8,
      'leaveBalance.sickLeave': 8,
      'leaveBalance.earnedLeave': 14
    }
  });
  
  console.log('Update result:', result);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
