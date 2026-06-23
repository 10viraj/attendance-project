const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/attendance-db').then(async () => {
  const users = await User.find({});
  console.log('Users in DB:', users.length);
  users.forEach(user => console.log(user.email, user.role));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
