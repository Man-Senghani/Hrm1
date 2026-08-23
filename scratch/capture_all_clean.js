const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const portals = [
  { role: 'employee', name: 'John Doe', email: 'employee@test.com', url: 'http://localhost:5000/employee/' },
  { role: 'hr', name: 'HR Manager', email: 'hr@hrm.com', url: 'http://localhost:5000/hr/' },
  { role: 'manager', name: 'Team Manager', email: 'manager@hrm.com', url: 'http://localhost:5000/manager/' },
  { role: 'admin', name: 'Super Admin', email: 'admin@hrm.com', url: 'http://localhost:5000/admin/dashboard' }
];

async function run() {
  console.log('🚀 Launching clean capture...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const portal of portals) {
    console.log(`\n📸 Capturing ${portal.role.toUpperCase()}...`);

    // 1. Desktop
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    await page.goto(portal.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(artifactDir, `${portal.role}_desktop.png`) });
    console.log(`  ✅ ${portal.role}_desktop.png`);
    await page.close();

    // 2. Mobile (Closed)
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    await mobilePage.goto(portal.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    await mobilePage.screenshot({ path: path.join(artifactDir, `${portal.role}_mobile_closed.png`) });
    console.log(`  ✅ ${portal.role}_mobile_closed.png`);

    // 3. Mobile (Open drawer via hamburger click)
    const menuBtn = await mobilePage.$('header button svg.lucide-menu') || await mobilePage.$('header button');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await mobilePage.screenshot({ path: path.join(artifactDir, `${portal.role}_mobile_open.png`) });
      console.log(`  ✅ ${portal.role}_mobile_open.png`);
    }
    await mobilePage.close();
  }

  await browser.close();
  console.log('\n🎉 ALL PORTALS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
