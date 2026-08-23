const puppeteer = require('puppeteer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const jwtSecret = 'fluidhr_security_protocol_v2_resync';
const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\cc656c5b-f280-49cb-be2a-fab382844440';

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

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

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const p of portals) {
    const validToken = signJwt(
      { id: '66a000000000000000000001', role: p.role, name: p.name, email: p.email },
      jwtSecret
    );

    console.log(`\n=== Capturing Portal: ${p.role.toUpperCase()} ===`);

    // 1. LIGHT MODE
    const pageLight = await browser.newPage();
    await pageLight.setViewport({ width: 1440, height: 900 });
    await pageLight.evaluateOnNewDocument((token, portal) => {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', portal.role);
      sessionStorage.setItem('user', JSON.stringify({
        _id: '66a000000000000000000001',
        name: portal.name,
        role: portal.role,
        email: portal.email
      }));
      localStorage.setItem('theme', 'light');
    }, validToken, p);

    await pageLight.goto(p.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    const lightPath = path.join(artifactDir, p.lightFile);
    await pageLight.screenshot({ path: lightPath });
    console.log(`✅ [LIGHT] ${p.lightFile} (${fs.statSync(lightPath).size} bytes) - URL: ${pageLight.url()}`);
    await pageLight.close();

    // 2. DARK MODE
    const pageDark = await browser.newPage();
    await pageDark.setViewport({ width: 1440, height: 900 });
    await pageDark.evaluateOnNewDocument((token, portal) => {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', portal.role);
      sessionStorage.setItem('user', JSON.stringify({
        _id: '66a000000000000000000001',
        name: portal.name,
        role: portal.role,
        email: portal.email
      }));
      localStorage.setItem('theme', 'dark');
    }, validToken, p);

    await pageDark.goto(p.url, { waitUntil: 'domcontentloaded' });
    await pageDark.evaluate(() => document.documentElement.classList.add('dark')).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    const darkPath = path.join(artifactDir, p.darkFile);
    await pageDark.screenshot({ path: darkPath });
    console.log(`✅ [DARK]  ${p.darkFile} (${fs.statSync(darkPath).size} bytes) - URL: ${pageDark.url()}`);
    await pageDark.close();
  }

  await browser.close();
  console.log('\n🎉 ALL 8 SCREENSHOTS GENERATED WITH SIGNED TOKENS!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
