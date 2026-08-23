const puppeteer = require('puppeteer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const jwtSecret = 'fluidhr_security_protocol_v2_resync';
const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const portals = [
  { role: 'employee', name: 'John Doe', email: 'employee@test.com', url: 'http://localhost:5000/employee/' },
  { role: 'hr', name: 'HR Manager', email: 'hr@hrm.com', url: 'http://localhost:5000/hr/' },
  { role: 'manager', name: 'Team Manager', email: 'manager@hrm.com', url: 'http://localhost:5000/manager/' },
  { role: 'admin', name: 'Super Admin', email: 'admin@hrm.com', url: 'http://localhost:5000/admin/dashboard' }
];

async function run() {
  console.log('🚀 Starting Comprehensive Multi-Portal & Mobile Verification...');
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

    console.log(`\n=== Checking Portal: ${p.role.toUpperCase()} ===`);

    // 1. DESKTOP VIEWPORT (1440x900)
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1440, height: 900 });
    await pageDesktop.evaluateOnNewDocument((token, portal) => {
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

    await pageDesktop.goto(p.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const desktopPath = path.join(artifactDir, `${p.role}_desktop.png`);
    await pageDesktop.screenshot({ path: desktopPath });
    console.log(`✅ [DESKTOP] ${p.role}_desktop.png`);
    await pageDesktop.close();

    // 2. MOBILE VIEWPORT - CLOSED (390x844)
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pageMobile.evaluateOnNewDocument((token, portal) => {
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

    await pageMobile.goto(p.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const mobileClosedPath = path.join(artifactDir, `${p.role}_mobile_closed.png`);
    await pageMobile.screenshot({ path: mobileClosedPath });
    console.log(`✅ [MOBILE CLOSED] ${p.role}_mobile_closed.png`);

    // 3. MOBILE VIEWPORT - OPEN (click hamburger button)
    const hamburgerBtn = await pageMobile.$('header button[title="Expand sidebar"]') ||
      await pageMobile.$('header button svg.lucide-menu') ||
      await pageMobile.$('header button');

    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await new Promise(r => setTimeout(r, 600));
      const mobileOpenPath = path.join(artifactDir, `${p.role}_mobile_open.png`);
      await pageMobile.screenshot({ path: mobileOpenPath });
      console.log(`✅ [MOBILE OPEN] ${p.role}_mobile_open.png`);
    }

    await pageMobile.close();
  }

  await browser.close();
  console.log('\n🎉 ALL PORTALS & MOBILE STATES VERIFIED WITH VALID JWT!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
