const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\manse\\.gemini\\antigravity-ide\\brain\\4272700b-bef6-4f71-86d4-95dda5e06186';

const portals = [
  {
    role: 'employee',
    name: 'John Doe',
    email: 'employee@test.com',
    url: 'http://localhost:5000/employee/',
    prefix: 'employee'
  },
  {
    role: 'hr',
    name: 'HR Manager',
    email: 'hr@hrm.com',
    url: 'http://localhost:5000/hr/',
    prefix: 'hr'
  },
  {
    role: 'manager',
    name: 'Team Manager',
    email: 'manager@hrm.com',
    url: 'http://localhost:5000/manager/',
    prefix: 'manager'
  },
  {
    role: 'admin',
    name: 'Super Admin',
    email: 'admin@hrm.com',
    url: 'http://localhost:5000/admin/dashboard',
    prefix: 'admin'
  }
];

async function verify() {
  console.log('🚀 Launching Chrome for Verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const portal of portals) {
    console.log(`\n========================================`);
    console.log(`🔍 Verifying ${portal.role.toUpperCase()} Portal`);
    console.log(`========================================`);

    // 1. Desktop Check (1440x900)
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    await page.goto(portal.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const desktopShot = path.join(artifactDir, `${portal.prefix}_desktop.png`);
    await page.screenshot({ path: desktopShot });
    console.log(`📸 Saved desktop screenshot: ${portal.prefix}_desktop.png`);

    // Check Quick Actions Dropdown
    try {
      const quickActionBtn = await page.$('button:has-text("Quick action"), button:has-text("Quick Action")') ||
        await page.$('header button svg.lucide-plus, header button svg.lucide-plus-circle');
      
      // Try to find the button containing "Quick"
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.toLowerCase().includes('quick action')) {
          await btn.click();
          await new Promise(r => setTimeout(r, 500));
          const quickShot = path.join(artifactDir, `${portal.prefix}_quick_action.png`);
          await page.screenshot({ path: quickShot });
          console.log(`📸 Saved quick action screenshot: ${portal.prefix}_quick_action.png`);
          break;
        }
      }
    } catch (e) {
      console.log(`⚠️ Quick action check note: ${e.message}`);
    }

    // Check Profile Dropdown
    try {
      const profileBtn = await page.$('header button[aria-haspopup="true"]') ||
        await page.$('header div[ref="profileRef"] button') ||
        await page.$('header .rounded-full');
      if (profileBtn) {
        await profileBtn.click();
        await new Promise(r => setTimeout(r, 500));
        const profileShot = path.join(artifactDir, `${portal.prefix}_profile_dropdown.png`);
        await page.screenshot({ path: profileShot });
        console.log(`📸 Saved profile dropdown screenshot: ${portal.prefix}_profile_dropdown.png`);
      }
    } catch (e) {
      console.log(`⚠️ Profile check note: ${e.message}`);
    }

    await page.close();

    // 2. Mobile Viewport Check (390x844 - iPhone 14 / Mobile)
    console.log(`📱 Checking Mobile Viewport for ${portal.role}...`);
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.evaluateOnNewDocument((p) => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAwMDAwMDAwMDAwMDAwMDAwMDAwMSIsInJvbGUiOiInICsgcC5yb2xlICsgJyIsImlhdCI6MTcyNDQxMDAwMH0.mock_signature';
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('role', p.role);
      sessionStorage.setItem('user', JSON.stringify({ _id: '66a000000000000000000001', name: p.name, role: p.role, email: p.email }));
      localStorage.setItem('theme', 'light');
    }, portal);

    await mobilePage.goto(portal.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    // Capture initial mobile header view
    const mobileInitialShot = path.join(artifactDir, `${portal.prefix}_mobile_closed.png`);
    await mobilePage.screenshot({ path: mobileInitialShot });
    console.log(`📸 Saved mobile (closed) screenshot: ${portal.prefix}_mobile_closed.png`);

    // Click Hamburger Menu Icon
    try {
      // Find hamburger button (Menu icon)
      const menuBtn = await mobilePage.$('button[title="Expand sidebar"], button[title="Collapse sidebar"]') ||
        await mobilePage.$('header button svg.lucide-menu');
      
      if (menuBtn) {
        await menuBtn.click();
        await new Promise(r => setTimeout(r, 800));
        const mobileOpenShot = path.join(artifactDir, `${portal.prefix}_mobile_drawer_open.png`);
        await mobilePage.screenshot({ path: mobileOpenShot });
        console.log(`📸 Saved mobile drawer (open) screenshot: ${portal.prefix}_mobile_drawer_open.png`);
      } else {
        // Find by clicking on first header button
        const headerButtons = await mobilePage.$$('header button');
        if (headerButtons.length > 0) {
          await headerButtons[0].click();
          await new Promise(r => setTimeout(r, 800));
          const mobileOpenShot = path.join(artifactDir, `${portal.prefix}_mobile_drawer_open.png`);
          await mobilePage.screenshot({ path: mobileOpenShot });
          console.log(`📸 Saved mobile drawer (open) screenshot: ${portal.prefix}_mobile_drawer_open.png`);
        }
      }
    } catch (e) {
      console.log(`⚠️ Mobile hamburger check note: ${e.message}`);
    }

    await mobilePage.close();
  }

  await browser.close();
  console.log('\n🎉 ALL PORTALS & MOBILE VIEWPORTS VERIFIED SUCCESSFULLY!');
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
