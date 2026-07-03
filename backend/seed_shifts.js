const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Shift = require('./models/Shift');

mongoose.connect(process.env.MONGO_URI, {
}).then(async () => {
  console.log('Connected to MongoDB');
  
  await Shift.deleteMany({});
  await Shift.create([
    { name: 'Morning', startTime: '10:00', endTime: '19:00' },
    { name: 'Night', startTime: '23:00', endTime: '08:00' }
  ]);
  console.log('Shifts replaced successfully!');
  
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
