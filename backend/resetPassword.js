require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/corporate_attendance';

console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected successfully!');
    const db = mongoose.connection.db;
    const adminPassword = await bcrypt.hash('admin123', 10);
    const employeePassword = await bcrypt.hash('employee123', 10);

    // 1. Admin account: admin@smartattend.com
    await db.collection('users').updateOne(
      { email: 'admin@smartattend.com' },
      {
        $set: {
          email: 'admin@smartattend.com',
          password: adminPassword,
          role: 'Admin',
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log('✓ Admin account configured: admin@smartattend.com / admin123');

    // 2. Secondary admin account: admin@gmail.com
    await db.collection('users').updateOne(
      { email: 'admin@gmail.com' },
      {
        $set: {
          email: 'admin@gmail.com',
          password: adminPassword,
          role: 'Admin',
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log('✓ Secondary admin configured: admin@gmail.com / admin123');

    // 3. Employee account: virajsomani@gmail.com
    const empUserRes = await db.collection('users').findOneAndUpdate(
      { email: 'virajsomani@gmail.com' },
      {
        $set: {
          email: 'virajsomani@gmail.com',
          password: employeePassword,
          role: 'Employee',
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log('✓ Employee account configured: virajsomani@gmail.com / employee123');

    // Ensure Employee profile exists for virajsomani@gmail.com
    const empUser = empUserRes.value || empUserRes;
    if (empUser && empUser._id) {
      await db.collection('employees').updateOne(
        { user: empUser._id },
        {
          $set: {
            user: empUser._id,
            employeeId: 'EMP01',
            firstName: 'Viraj',
            lastName: 'Somani',
            isActive: true,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      console.log('✓ Employee profile linked (EMP01)');
    }

    console.log('\nAll users and credentials ready for production!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    process.exit(1);
  });
