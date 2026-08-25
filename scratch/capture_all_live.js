const path = require('path');
const fs = require('fs');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch(e) {
  try {
    puppeteer = require('puppeteer-core');
  } catch(e2) {
    puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer'));
  }
}

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const targets = [
  {
    role: 'admin',
    url: 'https://hrm-staging.aupanishad.tech/admin/',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZkYTY5YWFkYmE2YmJjZTYxNSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ.Y0IERHsbCJxyqvAV_nhbygEWCnJ6sNEa2Z83Bm__MLM',
    user: { _id: "69eaf76da69aadba6bbce615", name: "System Admin", email: "admin@fluidhr.com", role: "admin" },
    file: 'live_admin_dashboard.png'
  },
  {
    role: 'hr',
    url: 'https://hrm-staging.aupanishad.tech/hr/',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYwZSIsInJvbGUiOiJociIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ.fwyCNnAZn3nYd_8fb2BGYf7yG6a2r6NKHnwDWM_GphM',
    user: { _id: "69eaf76ca69aadba6bbce60e", name: "Man Senghani", email: "man.senghani@fluidhr.com", role: "hr" },
    file: 'live_hr_dashboard.png'
  },
  {
    role: 'manager',
    url: 'https://hrm-staging.aupanishad.tech/manager/',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYwOCIsInJvbGUiOiJtYW5hZ2VyIiwiaWF0IjoxNzg3NjYzMDI2LCJleHAiOjE3ODgyNjc4MjZ9.FxN1drL8Qip5q1tzZV61sDYhPSQguXmc-vsnrvo_8Z0',
    user: { _id: "69eaf76ca69aadba6bbce608", name: "Kalpesh Patel", email: "kalpesh.patel@fluidhr.com", role: "manager" },
    file: 'live_manager_dashboard.png'
  },
  {
    role: 'employee',
    url: 'https://hrm-staging.aupanishad.tech/employee/',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYxMyIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ._QOoEd6OcFjbQD11a_1Oh8tUs_ztNIw6ilpBeuoTe-4',
    user: { _id: "69eaf76ca69aadba6bbce613", name: "Bhavik Kukadiya", email: "bhavik.kukadiya@fluidhr.com", role: "employee" },
    file: 'live_employee_dashboard.png'
  }
];

async function run() {
  console.log('🚀 Launching Chrome...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  for (const t of targets) {
    console.log(`📸 Processing ${t.role.toUpperCase()} Portal...`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await page.evaluateOnNewDocument((info) => {
        sessionStorage.setItem('token', info.token);
        sessionStorage.setItem('role', info.role);
        sessionStorage.setItem('user', JSON.stringify(info.user));
        localStorage.setItem('theme', 'dark');
      }, t);

      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async () => {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      });

      await new Promise(r => setTimeout(r, 3500));

      const outPath = path.join(artifactDir, t.file);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✅ [SUCCESS] Saved ${t.file}`);
      await page.close().catch(() => {});
    } catch(err) {
      console.error(`❌ [ERROR] ${t.role}:`, err.message);
    }
  }

  await browser.close().catch(() => {});
  console.log('🎉 All live screenshots completed!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
