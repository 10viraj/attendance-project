const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const admin = await User.findOne({ role: 'Admin' });
  if (!admin) {
    console.log('No admin found');
    process.exit(1);
  }
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  const axios = require('axios');
  try {
    const res = await axios.get('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('API returned:', res.data);
  } catch (err) {
    console.error('API error:', err.response ? err.response.data : err.message);
  }
  process.exit(0);
});
