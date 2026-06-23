const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const empUser = await User.findOne({ role: 'Employee' });
  const token = jwt.sign({ id: empUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  try {
    const res = await fetch('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Employee API returned status:', res.status);
    console.log('Employee API returned count:', data.count);
  } catch (err) {
    console.error('API error:', err);
  }
  process.exit(0);
});
