const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/corporate_attendance')
  .then(async () => {
    const db = mongoose.connection.db;
    const adminPassword = await bcrypt.hash('admin123', 10);
    const employeePassword = await bcrypt.hash('employee123', 10);

    // 1. Reset admin@gmail.com
    await db.collection('users').updateOne(
      { email: 'admin@gmail.com' },
      { $set: { password: adminPassword, role: 'Admin' } }
    );

    // 2. Ensure admin@smartattend.com (referenced in README & tests) exists with admin123
    const smartAdmin = await db.collection('users').findOne({ email: 'admin@smartattend.com' });
    if (!smartAdmin) {
      await db.collection('users').insertOne({
        email: 'admin@smartattend.com',
        password: adminPassword,
        role: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created admin@smartattend.com account.');
    } else {
      await db.collection('users').updateOne(
        { email: 'admin@smartattend.com' },
        { $set: { password: adminPassword, role: 'Admin' } }
      );
      console.log('Updated admin@smartattend.com password.');
    }

    // 3. Reset employee accounts
    const employeeEmails = [
      'virajsomani@gmail.com',
      'jaimin@gmail.com',
      'mohit@gmail.com',
      'jigar@gmail.com',
      'abcd@gmail.com'
    ];

    for (const email of employeeEmails) {
      await db.collection('users').updateOne(
        { email },
        { $set: { password: employeePassword } }
      );
    }

    console.log('Employee and Admin passwords successfully reset.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
