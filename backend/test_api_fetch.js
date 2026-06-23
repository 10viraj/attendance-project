const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const admin = await User.findOne({ role: 'Admin' });
  if (!admin) {
    console.log('No admin found');
    process.exit(1);
  }
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  try {
    const res = await fetch('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('API returned status:', res.status);
    console.log('API returned data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('API error:', err);
  }
  process.exit(0);
});
