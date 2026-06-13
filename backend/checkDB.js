const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');

mongoose.connect('mongodb://127.0.0.1:27017/corporate_attendance').then(async () => {
  const users = await User.find();
  console.log(`Users: ${users.length}`);
  
  const employees = await Employee.find();
  console.log(`Employees: ${employees.length}`);
  
  for (const user of users) {
    if (user.role === 'Admin') continue;
    const emp = employees.find(e => e.user.toString() === user._id.toString());
    console.log(`User ${user.email} -> Employee profile: ${emp ? emp.employeeId : 'MISSING'}`);
  }
  
  process.exit(0);
});
