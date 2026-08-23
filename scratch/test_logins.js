const http = require('http');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
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
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function tryLogins() {
  console.log('Testing authentication on http://localhost:5000/api/auth/login...');
  const testAccounts = [
    { email: 'employee@test.com', password: 'password123' },
    { email: 'manager@test.com', password: 'password123' },
    { email: 'admin@test.com', password: 'password123' },
    { email: 'admin@hrm.com', password: 'password123' },
    { email: 'man@gmail.com', password: 'password123' }
  ];

  for (const acc of testAccounts) {
    const res = await postJson('/api/auth/login', acc);
    console.log(acc.email, '->', res.status, res.data?.role || res.data?.message || '');
  }
}

tryLogins();
