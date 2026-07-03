const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mobile/src/screens/admin/AdminShiftsScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard terms
content = content.replace(/AdminHolidaysScreen/g, 'AdminShiftsScreen');
content = content.replace(/holidays/g, 'shifts');
content = content.replace(/holiday/g, 'shift');
content = content.replace(/Holidays/g, 'Shifts');
content = content.replace(/Holiday/g, 'Shift');
content = content.replace(/\/shifts/g, '/shifts'); // already replaced holidays with shifts
content = content.replace(/setHolidays/g, 'setShifts');
content = content.replace(/fetchHolidays/g, 'fetchShifts');

// Replace fields
content = content.replace(/const \[date, setDate\] = useState\(''\);/g, `const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [gracePeriod, setGracePeriod] = useState('15');
  const [halfDayHours, setHalfDayHours] = useState('4');
  const [fullDayHours, setFullDayHours] = useState('8');`);

content = content.replace(/date/g, 'startTime'); // Quick hack, will refine later
content = content.replace(/type/g, 'gracePeriod'); 
content = content.replace(/description/g, 'endTime');

fs.writeFileSync(filePath, content);
console.log('File modified successfully');
