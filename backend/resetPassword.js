const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/corporate_attendance')
  .then(async () => {
    const db = mongoose.connection.db;
    const employeePassword = await bcrypt.hash('employee123', 10);
    await db.collection('users').updateOne(
      { email: 'virajsomani@gmail.com' },
      { $set: { password: employeePassword } }
    );
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.collection('users').updateOne(
      { email: 'admin@smartattend.com' },
      { $set: { password: adminPassword } }
    );
    
    console.log('Employee and Admin passwords successfully reset.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
