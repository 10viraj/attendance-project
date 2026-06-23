const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/corporate_attendance').then(async () => {
  const users = await User.find({});
  console.log('Users in DB:', users.length);
  users.forEach(user => console.log(user.email, user.role));
  
  const employees = await Employee.find({});
  console.log('Employees in DB:', employees.length);
  employees.forEach(emp => console.log(emp.firstName, emp.lastName, emp.employeeId, emp.isActive));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
