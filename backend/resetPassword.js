const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/corporate_attendance')
  .then(async () => {
    const db = mongoose.connection.db;
    const hashedPassword = await bcrypt.hash('employee123', 10);
    await db.collection('users').updateOne(
      { email: 'virajsomani@gmail.com' },
      { $set: { password: hashedPassword } }
    );
    console.log('Employee password successfully reset.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
