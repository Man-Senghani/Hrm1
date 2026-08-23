const puppeteer = require('puppeteer');
const path = require('path');
const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const portals = [
  { role: 'employee', name: 'John Doe', email: 'employee@test.com', url: 'http://localhost:5000/employee/' },
  { role: 'hr', name: 'HR Manager', email: 'hr@hrm.com', url: 'http://localhost:5000/hr/' },
  { role: 'manager', name: 'Team Manager', email: 'manager@hrm.com', url: 'http://localhost:5000/manager/' },
  { role: 'admin', name: 'Super Admin', email: 'admin@hrm.com', url: 'http://localhost:5000/admin/dashboard' }
];

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const p of portals) {
    // 1. Desktop
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument((portal) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcG9ydGFsLnJvbGUgKyAnIiwiaWF0IjoxNzI0NDEwMDAwfQ.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', portal.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: portal.name, role: portal.role, email: portal.email }));
      localStorage.setItem('theme', 'light');
    }, p);

    await page.goto(p.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, `${p.role}_desktop.png`) });
    console.log(`Saved: ${p.role}_desktop.png`);
    await page.close();

    // 2. Mobile Closed
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844 });
    await mobilePage.evaluateOnNewDocument((portal) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcG9ydGFsLnJvbGUgKyAnIiwiaWF0IjoxNzI0NDEwMDAwfQ.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', portal.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: portal.name, role: portal.role, email: portal.email }));
      localStorage.setItem('theme', 'light');
    }, p);

    await mobilePage.goto(p.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await mobilePage.screenshot({ path: path.join(artifactDir, `${p.role}_mobile_closed.png`) });
    console.log(`Saved: ${p.role}_mobile_closed.png`);

    // 3. Mobile Open (click hamburger)
    const menuBtn = await mobilePage.$('header button');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await mobilePage.screenshot({ path: path.join(artifactDir, `${p.role}_mobile_open.png`) });
      console.log(`Saved: ${p.role}_mobile_open.png`);
    }
    await mobilePage.close();
  }

  await browser.close();
  console.log('ALL DONE!');
}

capture().catch(console.error);
