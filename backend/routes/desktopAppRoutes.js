const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// In-memory cache for GitHub release data (5 minutes TTL)
let cachedRelease = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Helper to read local desktop-tracker package.json as fallback
const getLocalPackageInfo = () => {
  try {
    const pkgPath = path.resolve(__dirname, '../../desktop-tracker/package.json');
    if (fs.existsSync(pkgPath)) {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading desktop-tracker package.json:', err);
  }
  return { version: '1.3.7', name: 'fluidhr-desktop-tracker', description: 'FluidHR Desktop Tracker' };
};

// Fetch latest release info from GitHub repository
const getLatestReleaseInfo = async () => {
  const now = Date.now();
  if (cachedRelease && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedRelease;
  }

  const pkg = getLocalPackageInfo();
  const repoOwner = pkg?.build?.publish?.owner || 'mansenghani';
  const repoName = pkg?.build?.publish?.repo || 'Hrm1';
  const fallbackVersion = pkg.version || '1.1.1';
  const fallbackDownloadUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/v${fallbackVersion}/FluidHR-Tracker-Setup-${fallbackVersion}.exe`;

  try {
    const res = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers: {
        'User-Agent': 'FluidHR-Backend',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 5000
    });

    if (res.data) {
      const release = res.data;
      const tagVersion = (release.tag_name || '').replace(/^v/i, '') || fallbackVersion;
      const exeAsset = Array.isArray(release.assets) 
        ? release.assets.find(a => a.name && a.name.endsWith('.exe')) 
        : null;

      const directUrl = exeAsset ? exeAsset.browser_download_url : fallbackDownloadUrl;
      const sizeBytes = exeAsset ? exeAsset.size : 76901618;
      const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);

      cachedRelease = {
        version: tagVersion,
        name: release.name || `FluidHR Desktop Tracker v${tagVersion}`,
        description: release.body || 'Official FluidHR Desktop Tracker for Windows',
        sizeMb: sizeMb,
        platform: 'Windows (x64 / x86)',
        minOs: 'Windows 10 / 11',
        downloadUrl: directUrl,
        installerName: exeAsset?.name || `FluidHR-Tracker-Setup-${tagVersion}.exe`,
        releaseDate: release.published_at ? release.published_at.split('T')[0] : new Date().toISOString().split('T')[0]
      };
      lastFetchTime = now;
      return cachedRelease;
    }
  } catch (err) {
    console.warn('Could not fetch latest release from GitHub, using package.json defaults:', err.message);
  }

  // Fallback if GitHub API is unreachable
  return {
    version: fallbackVersion,
    name: 'FluidHR Desktop Tracker',
    description: 'Official FluidHR Desktop Tracker for Windows',
    sizeMb: '76.9',
    platform: 'Windows (x64 / x86)',
    minOs: 'Windows 10 / 11',
    downloadUrl: fallbackDownloadUrl,
    installerName: `FluidHR-Tracker-Setup-${fallbackVersion}.exe`,
    releaseDate: new Date().toISOString().split('T')[0]
  };
};

/**
 * @route GET /api/desktop-app/info
 * @desc Get latest version and download URL for FluidHR Desktop Tracker
 */
router.get('/info', async (req, res) => {
  try {
    const isStaging = req.query.env === 'staging' || (req.headers.host && req.headers.host.includes('staging'));
    if (isStaging) {
      return res.json({
        success: true,
        version: '1.0.1',
        name: 'FluidHR Desktop Tracker (Staging)',
        description: 'Official FluidHR Desktop Tracker for Staging Testing',
        sizeMb: '76.9',
        platform: 'Windows (x64 / x86)',
        minOs: 'Windows 10 / 11',
        downloadUrl: '/api/desktop-app/download?env=staging',
        installerName: 'FluidHR-Tracker-Staging-Setup-1.0.1.exe',
        releaseDate: new Date().toISOString().split('T')[0],
        directDownloadUrl: '/api/desktop-app/download?env=staging'
      });
    }

    const info = await getLatestReleaseInfo();
    return res.json({
      success: true,
      ...info,
      directDownloadUrl: '/api/desktop-app/download'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/desktop-app/download
 * @desc Download latest official .exe installer (redirects or serves binary)
 */
router.get('/download', async (req, res) => {
  const isStaging = req.query.env === 'staging' || (req.headers.host && req.headers.host.includes('staging'));
  const version = isStaging ? '1.0.1' : (getLocalPackageInfo().version || '1.4.1');

  // 1. Check if a custom upload exists in backend/uploads/desktop/
  const uploadsDesktopDir = path.resolve(__dirname, '../uploads/desktop');
  if (fs.existsSync(uploadsDesktopDir)) {
    if (isStaging) {
      const preferredStaging = ['FluidHR-Tracker-Staging-Setup-1.0.1.exe', 'FluidHR-Tracker-Staging-Setup.exe', 'FluidHR-Tracker-Staging-Setup-1.0.0.exe'];
      for (const candidate of preferredStaging) {
        const fullPath = path.join(uploadsDesktopDir, candidate);
        if (fs.existsSync(fullPath)) {
          res.setHeader('Content-Disposition', `attachment; filename="${candidate}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          return res.sendFile(fullPath);
        }
      }
    }
    const files = fs.readdirSync(uploadsDesktopDir);
    const exeFile = files.find(f => {
      if (!f.endsWith('.exe')) return false;
      if (isStaging) return f.toLowerCase().includes('staging');
      return !f.toLowerCase().includes('staging');
    });
    if (exeFile) {
      const filePath = path.join(uploadsDesktopDir, exeFile);
      res.setHeader('Content-Disposition', `attachment; filename="${exeFile}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(filePath);
    }
  }

  // 2. Check if a local build exists in desktop-tracker/dist/
  const distDir = path.resolve(__dirname, '../../desktop-tracker/dist');
  if (fs.existsSync(distDir)) {
    if (isStaging) {
      const preferredStaging = ['FluidHR-Tracker-Staging-Setup-1.0.1.exe', 'FluidHR-Tracker-Staging-Setup.exe', 'FluidHR-Tracker-Staging-Setup-1.0.0.exe'];
      for (const candidate of preferredStaging) {
        const fullPath = path.join(distDir, candidate);
        if (fs.existsSync(fullPath)) {
          res.setHeader('Content-Disposition', `attachment; filename="${candidate}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          return res.sendFile(fullPath);
        }
      }
    }
    const files = fs.readdirSync(distDir);
    const exeFile = files.find(f => {
      if (!f.endsWith('.exe') || f.includes('builder')) return false;
      if (isStaging) return f.toLowerCase().includes('staging');
      return !f.toLowerCase().includes('staging');
    });
    if (exeFile) {
      const filePath = path.join(distDir, exeFile);
      res.setHeader('Content-Disposition', `attachment; filename="${exeFile}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(filePath);
    }
  }

  // 3. Otherwise redirect to official latest GitHub Release binary installer
  const releaseInfo = await getLatestReleaseInfo();
  const directExeUrl = isStaging 
    ? `https://github.com/Man-Senghani/Hrm1/releases/download/v1.0.1-staging/FluidHR-Tracker-Staging-Setup-1.0.1.exe`
    : releaseInfo.downloadUrl;
  return res.redirect(302, directExeUrl);
});

module.exports = router;
