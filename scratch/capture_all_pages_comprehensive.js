const puppeteer = require('puppeteer');
const path = require('path');

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const pages = [
  // Admin
  { role: 'admin', url: 'https://hrm-staging.aupanishad.tech/admin/attendance', file: 'live_admin_attendance.png' },
  { role: 'admin', url: 'https://hrm-staging.aupanishad.tech/admin/leave', file: 'live_admin_leave.png' },
  // HR
  { role: 'hr', url: 'https://hrm-staging.aupanishad.tech/hr/attendance', file: 'live_hr_attendance.png' },
  { role: 'hr', url: 'https://hrm-staging.aupanishad.tech/hr/leave', file: 'live_hr_leave.png' },
  // Manager
  { role: 'manager', url: 'https://hrm-staging.aupanishad.tech/manager/attendance', file: 'live_manager_attendance.png' },
  { role: 'manager', url: 'https://hrm-staging.aupanishad.tech/manager/tasks', file: 'live_manager_tasks.png' },
  // Employee
  { role: 'employee', url: 'https://hrm-staging.aupanishad.tech/employee/attendance', file: 'live_employee_attendance.png' },
  { role: 'employee', url: 'https://hrm-staging.aupanishad.tech/employee/leave', file: 'live_employee_leave.png' }
];

const credentials = {
  admin: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZkYTY5YWFkYmE2YmJjZTYxNSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ.Y0IERHsbCJxyqvAV_nhbygEWCnJ6sNEa2Z83Bm__MLM',
    user: { _id: "69eaf76da69aadba6bbce615", name: "System Admin", email: "admin@fluidhr.com", role: "admin" }
  },
  hr: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYwZSIsInJvbGUiOiJociIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ.fwyCNnAZn3nYd_8fb2BGYf7yG6a2r6NKHnwDWM_GphM',
    user: { _id: "69eaf76ca69aadba6bbce60e", name: "Man Senghani", email: "man.senghani@fluidhr.com", role: "hr" }
  },
  manager: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYwOCIsInJvbGUiOiJtYW5hZ2VyIiwiaWF0IjoxNzg3NjYzMDI2LCJleHAiOjE3ODgyNjc4MjZ9.FxN1drL8Qip5q1tzZV61sDYhPSQguXmc-vsnrvo_8Z0',
    user: { _id: "69eaf76ca69aadba6bbce608", name: "Kalpesh Patel", email: "kalpesh.patel@fluidhr.com", role: "manager" }
  },
  employee: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZWFmNzZjYTY5YWFkYmE2YmJjZTYxMyIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTc4NzY2MzAyNiwiZXhwIjoxNzg4MjY3ODI2fQ._QOoEd6OcFjbQD11a_1Oh8tUs_ztNIw6ilpBeuoTe-4',
    user: { _id: "69eaf76ca69aadba6bbce613", name: "Bhavik Kukadiya", email: "bhavik.kukadiya@fluidhr.com", role: "employee" }
  }
};

async function run() {
  console.log('🚀 Capturing subpages...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const p of pages) {
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      const cred = credentials[p.role];

      await page.evaluateOnNewDocument((c, role) => {
        sessionStorage.setItem('token', c.token);
        sessionStorage.setItem('role', role);
        sessionStorage.setItem('user', JSON.stringify(c.user));
        localStorage.setItem('theme', 'dark');
      }, cred, p.role);

      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(async () => {
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      });

      await new Promise(r => setTimeout(r, 2000));
      const outPath = path.join(artifactDir, p.file);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✅ Saved ${p.file}`);
      await page.close();
    } catch(e) {
      console.error(`❌ Error in ${p.file}:`, e.message);
    }
  }

  await browser.close();
  console.log('🎉 All subpages captured!');
  process.exit(0);
}

run();
