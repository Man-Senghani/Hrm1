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

  for (const portal of portals) {
    console.log(`\n=== Processing ${portal.role.toUpperCase()} ===`);

    // Light Mode
    const pageLight = await browser.newPage();
    await pageLight.setViewport({ width: 1440, height: 900 });
    await pageLight.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    await pageLight.goto(portal.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    const lightPath = path.join(artifactDir, portal.lightFile);
    await pageLight.screenshot({ path: lightPath });
    console.log(`✅ [LIGHT] ${portal.lightFile} (${fs.statSync(lightPath).size} bytes) - URL: ${pageLight.url()}`);
    await pageLight.close();

    // Dark Mode
    const pageDark = await browser.newPage();
    await pageDark.setViewport({ width: 1440, height: 900 });
    await pageDark.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'dark');
    }, portal);

    await pageDark.goto(portal.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await pageDark.evaluate(() => document.documentElement.classList.add('dark')).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    const darkPath = path.join(artifactDir, portal.darkFile);
    await pageDark.screenshot({ path: darkPath });
    console.log(`✅ [DARK]  ${portal.darkFile} (${fs.statSync(darkPath).size} bytes) - URL: ${pageDark.url()}`);
    await pageDark.close();
  }

  await browser.close();
  console.log('\n🎉 ALL DASHBOARD SCREENSHOTS COMPLETED!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
