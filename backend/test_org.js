const axios = require('axios');

async function testOrg() {
  try {
    // 1. Log in to get token
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@smartattend.com',
      password: 'admin123'
    });
    
    const token = login.data.token;
    
    // 2. Put organization
    const res = await axios.put('http://localhost:5000/api/organization', {
      name: 'Test Company'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testOrg();
