const https = require('https');

function postLogin(email, password) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ email, password });
    const req = https.request({
      hostname: 'hrm1-wljp.onrender.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(payload);
    req.end();
  });
}

async function testAccounts() {
  const accounts = [
    { email: 'admin@hrm.com', password: 'password123' },
    { email: 'hr@hrm.com', password: 'password123' },
    { email: 'manager@hrm.com', password: 'password123' },
    { email: 'employee@test.com', password: 'password123' },
    { email: 'admin@test.com', password: 'password123' },
    { email: 'admin@admin.com', password: 'password123' },
    { email: 'mansenghani6@gmail.com', password: 'password123' },
    { email: 'admin@hrm.com', password: 'admin' },
    { email: 'admin@hrm.com', password: 'password' }
  ];

  for (const acc of accounts) {
    const res = await postLogin(acc.email, acc.password);
    console.log(acc.email, '=> Status:', res.status, res.data?.token ? `SUCCESS (Role: ${res.data?.user?.role})` : res.data?.message);
    if (res.data?.token) {
      console.log('User Payload:', JSON.stringify(res.data.user));
    }
  }
}

testAccounts();
