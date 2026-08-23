const http = require('http');

const urls = [
  'http://localhost:5000/',
  'http://localhost:5000/admin',
  'http://localhost:5000/admin/dashboard',
  'http://localhost:5000/hr',
  'http://localhost:5000/hr/employees',
  'http://localhost:5000/employee',
  'http://localhost:5000/employee/attendance',
  'http://localhost:5000/manager',
  'http://localhost:5000/manager/tasks',
  'http://localhost:5000/api/version',
  'http://localhost:5000/api/health'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const isHtml = (res.headers['content-type'] || '').includes('text/html');
        const isJson = (res.headers['content-type'] || '').includes('application/json');
        const cacheControl = res.headers['cache-control'] || 'none';
        resolve({
          url,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          cacheControl,
          preview: isJson ? body.trim() : (body.includes('<title>') ? body.match(/<title>(.*?)<\/title>/)?.[1] : 'HTML Page')
        });
      });
    }).on('error', (err) => {
      resolve({ url, status: 'ERROR', error: err.message });
    });
  });
}

async function runAll() {
  console.log('Testing unified routes on http://localhost:5000 ...');
  for (const u of urls) {
    const result = await checkUrl(u);
    console.log(result);
  }
}

runAll();
