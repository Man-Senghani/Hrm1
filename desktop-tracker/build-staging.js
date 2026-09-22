const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, 'package.json');
const pkgBakPath = path.join(__dirname, 'package.json.bak');
const configPath = path.join(__dirname, 'tracker-config.json');

console.log('🚀 [Build Staging] Preparing Staging Desktop Tracker v1.0.0 build...');

// 1. Backup original package.json
const origPkgRaw = fs.readFileSync(pkgPath, 'utf8');
fs.writeFileSync(pkgBakPath, origPkgRaw, 'utf8');

try {
  const pkg = JSON.parse(origPkgRaw);

  // 2. Configure for Staging
  pkg.name = 'fluidhr-desktop-tracker-staging';
  pkg.version = '1.0.0';
  if (!pkg.build) pkg.build = {};
  pkg.build.appId = 'com.fluidhr.tracker.staging';
  pkg.build.productName = 'FluidHR Tracker (Staging)';
  pkg.build.artifactName = 'FluidHR-Tracker-Staging-Setup-${version}.${ext}';
  pkg.build.protocols = [
    {
      name: 'FluidHR Staging Tracker Protocol',
      schemes: ['fluidhr-staging-tracker']
    }
  ];
  if (!pkg.build.nsis) pkg.build.nsis = {};
  pkg.build.nsis.shortcutName = 'FluidHR Tracker (Staging)';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

  // 3. Write staging tracker-config.json
  const stagingConfig = {
    environment: 'staging',
    appId: 'com.fluidhr.tracker.staging',
    appName: 'FluidHR Tracker (Staging)',
    productName: 'FluidHR Tracker (Staging)',
    protocol: 'fluidhr-staging-tracker',
    bridgePort: 28735,
    defaultServer: 'https://staging.fluidhr.in',
    version: '1.0.0'
  };
  fs.writeFileSync(configPath, JSON.stringify(stagingConfig, null, 2), 'utf8');

  // 4. Run electron-builder
  console.log('🔨 [Build Staging] Compiling installer with electron-builder...');
  execSync('npx electron-builder --win --x64', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, TRACKER_ENV: 'staging' }
  });

  console.log('✅ [Build Staging] Staging Desktop Tracker compiled successfully!');

  // Copy unversioned installer for web download endpoint
  const distDir = path.join(__dirname, 'dist');
  const targetVersioned = path.join(distDir, 'FluidHR-Tracker-Staging-Setup-1.0.0.exe');
  const targetUnversioned = path.join(distDir, 'FluidHR-Tracker-Staging-Setup.exe');
  if (fs.existsSync(targetVersioned)) {
    fs.copyFileSync(targetVersioned, targetUnversioned);
    console.log(`📦 Created ${targetUnversioned}`);
  }

  // Also copy to backend/uploads/desktop if directory exists
  const backendDesktopUploads = path.join(__dirname, '../backend/uploads/desktop');
  if (fs.existsSync(backendDesktopUploads)) {
    if (fs.existsSync(targetVersioned)) {
      fs.copyFileSync(targetVersioned, path.join(backendDesktopUploads, 'FluidHR-Tracker-Staging-Setup-1.0.0.exe'));
      fs.copyFileSync(targetVersioned, path.join(backendDesktopUploads, 'FluidHR-Tracker-Staging-Setup.exe'));
      console.log('📤 Copied Staging installer to backend/uploads/desktop/');
    }
  }

} catch (err) {
  console.error('❌ [Build Staging] Build failed:', err);
  throw err;
} finally {
  // 5. Always restore original package.json and clean up config
  if (fs.existsSync(pkgBakPath)) {
    fs.writeFileSync(pkgPath, fs.readFileSync(pkgBakPath, 'utf8'), 'utf8');
    fs.unlinkSync(pkgBakPath);
    console.log('🔄 Restored original package.json');
  }
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}
