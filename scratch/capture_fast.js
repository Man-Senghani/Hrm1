const puppeteer = require('puppeteer');
const path = require('path');
const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const portals = [
  { role: 'employee', name: 'John Doe', email: 'employee@test.com', url: 'http://localhost:5000/employee/' },
  { role: 'manager', name: 'Team Manager', email: 'manager@hrm.com', url: 'http://localhost:5000/manager/' },
  { role: 'admin', name: 'Super Admin', email: 'admin@hrm.com', url: 'http://localhost:5000/admin/dashboard' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const portal of portals) {
    console.log('Processing:', portal.role);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    // First open and seed sessionStorage
    await page.goto(portal.url);
    await page.evaluate((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    // Reload with stored session
    await page.goto(portal.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, `${portal.role}_desktop.png`) });
    console.log(`Saved: ${portal.role}_desktop.png`);

    // Mobile
    await page.setViewport({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, `${portal.role}_mobile_closed.png`) });
    console.log(`Saved: ${portal.role}_mobile_closed.png`);

    // Open Drawer
    const btn = await page.$('header button');
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(artifactDir, `${portal.role}_mobile_open.png`) });
      console.log(`Saved: ${portal.role}_mobile_open.png`);
    }

    await page.close();
  }

  await browser.close();
  console.log('DONE!');
}

run().catch(console.error);
