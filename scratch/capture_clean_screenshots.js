const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\cc656c5b-f280-49cb-be2a-fab382844440';

const portals = [
  {
    role: 'admin',
    name: 'Super Admin',
    email: 'admin@hrm.com',
    url: 'http://localhost:5000/admin/dashboard',
    lightFile: 'admin_dashboard_light.png',
    darkFile: 'admin_dashboard_dark.png'
  },
  {
    role: 'hr',
    name: 'HR Manager',
    email: 'hr@hrm.com',
    url: 'http://localhost:5000/hr/',
    lightFile: 'hr_dashboard_light.png',
    darkFile: 'hr_dashboard_dark.png'
  },
  {
    role: 'manager',
    name: 'Team Manager',
    email: 'manager@hrm.com',
    url: 'http://localhost:5000/manager/',
    lightFile: 'manager_dashboard_light.png',
    darkFile: 'manager_dashboard_dark.png'
  },
  {
    role: 'employee',
    name: 'John Doe',
    email: 'employee@test.com',
    url: 'http://localhost:5000/employee/dashboard',
    lightFile: 'employee_dashboard_light.png',
    darkFile: 'employee_dashboard_dark.png'
  }
];

async function capture() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // First visit localhost:5000 to establish origin storage
  await page.goto('http://localhost:5000/', { waitUntil: 'domcontentloaded' });

  for (const portal of portals) {
    console.log(`=== Capturing ${portal.role.toUpperCase()} ===`);

    // 1. Set credentials on origin for light mode
    await page.evaluate((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    }, portal);

    await page.goto(portal.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));

    const lightPath = path.join(artifactDir, portal.lightFile);
    await page.screenshot({ path: lightPath });
    console.log(`✅ [LIGHT] Saved: ${portal.lightFile} (${fs.statSync(lightPath).size} bytes)`);

    // 2. Switch to Dark Mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await new Promise(r => setTimeout(r, 1000));

    const darkPath = path.join(artifactDir, portal.darkFile);
    await page.screenshot({ path: darkPath });
    console.log(`✅ [DARK]  Saved: ${portal.darkFile} (${fs.statSync(darkPath).size} bytes)`);
  }

  await browser.close();
  console.log('🎉 ALL 8 SCREENSHOTS COMPLETED!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
