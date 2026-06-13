const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/corporate_attendance').then(async () => {
  console.log('Connected to DB for cleanup');
  
  const User = require('./models/User');
  const Employee = require('./models/Employee');
  
  const users = await User.find({ role: 'Employee' });
  let deletedCount = 0;
  
  for (const user of users) {
    const employee = await Employee.findOne({ user: user._id });
    if (!employee) {
      console.log(`Deleting broken user account: ${user.email}`);
      await User.deleteOne({ _id: user._id });
      deletedCount++;
    }
  }
  
  console.log(`Cleanup complete. Deleted ${deletedCount} broken accounts.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
