const mongoose = require('mongoose');
const Employee = require('./models/Employee');

mongoose.connect('mongodb://localhost:27017/attendance-db').then(async () => {
  const employees = await Employee.find({});
  console.log('Employees in DB:', employees.length);
  employees.forEach(emp => console.log(emp.firstName, emp.lastName, emp.employeeId, emp.isActive));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
