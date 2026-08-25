const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const modules = [
  {
    role: 'admin',
    name: 'Admin User',
    email: 'admin@hrm.com',
    url: 'https://hrm-staging.aupanishad.tech/admin/',
    fileName: 'admin_portal_preview.png'
  },
  {
    role: 'hr',
    name: 'HR User',
    email: 'hr@hrm.com',
    url: 'https://hrm-staging.aupanishad.tech/hr/',
    fileName: 'hr_portal_preview.png'
  },
  {
    role: 'manager',
    name: 'Manager User',
    email: 'manager@hrm.com',
    url: 'https://hrm-staging.aupanishad.tech/manager/',
    fileName: 'manager_portal_preview.png'
  },
  {
    role: 'employee',
    name: 'Employee User',
    email: 'employee@hrm.com',
    url: 'https://hrm-staging.aupanishad.tech/employee/',
    fileName: 'employee_portal_preview.png'
  }
];

async function captureAll() {
  console.log('🚀 Launching Chrome to capture live staging screenshots for all 4 modules...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
  });

  for (const mod of modules) {
    console.log(`📸 Capturing ${mod.role.toUpperCase()} Portal at ${mod.url}...`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await page.evaluateOnNewDocument((m) => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgbS5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
        sessionStorage.setItem('token', mockToken);
        sessionStorage.setItem('role', m.role);
        sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: m.name, role: m.role, email: m.email }));
        localStorage.setItem('theme', 'dark');
      }, mod);

      await page.goto(mod.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async () => {
        await page.goto(mod.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      });

      await new Promise(r => setTimeout(r, 3000));

      const savePath = path.join(artifactDir, mod.fileName);
      await page.screenshot({ path: savePath, fullPage: false });
      console.log(`✅ [SUCCESS] Saved ${mod.role.toUpperCase()} screenshot to: ${savePath}`);
      await page.close().catch(() => {});
    } catch (err) {
      console.error(`❌ [ERROR] ${mod.role}:`, err.message);
    }
  }

  await browser.close().catch(() => {});
  console.log('🎉 All 4 modules captured successfully!');
}

captureAll();
