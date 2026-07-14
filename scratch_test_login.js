const axios = require('axios');

async function test() {
  try {
    const email = 'test.employee' + Date.now() + '@example.com';
    const password = 'password123';
    
    // 1. Create employee
    console.log('Registering...', email);
    const regRes = await axios.post('http://localhost:5000/api/auth/register', {
      firstName: 'Test',
      lastName: 'Employee',
      email: email,
      password: password,
      role: 'Employee'
    });
    console.log('Register Success:', regRes.data.success);
    
    // 2. Login
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: email,
      password: password
    });
    console.log('Login Success:', loginRes.data.success);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

test();
