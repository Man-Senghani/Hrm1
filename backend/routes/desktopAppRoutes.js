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
  return { version: '1.2.8', name: 'fluidhr-desktop-tracker', description: 'FluidHR Desktop Tracker' };
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
  const pkg = getLocalPackageInfo();
  const version = pkg.version || '1.1.1';

  // 1. Check if a local build exists in desktop-tracker/dist/
  const distDir = path.resolve(__dirname, '../../desktop-tracker/dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    const exeFile = files.find(f => f.endsWith('.exe') && !f.includes('builder'));
    if (exeFile) {
      const filePath = path.join(distDir, exeFile);
      res.setHeader('Content-Disposition', `attachment; filename="${exeFile}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(filePath);
    }
  }

  // 2. Check if a custom upload exists in backend/uploads/desktop/
  const uploadsDesktopDir = path.resolve(__dirname, '../uploads/desktop');
  if (fs.existsSync(uploadsDesktopDir)) {
    const files = fs.readdirSync(uploadsDesktopDir);
    const exeFile = files.find(f => f.endsWith('.exe'));
    if (exeFile) {
      const filePath = path.join(uploadsDesktopDir, exeFile);
      res.setHeader('Content-Disposition', `attachment; filename="${exeFile}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(filePath);
    }
  }

  // 3. Otherwise redirect to official latest GitHub Release binary installer (~77MB .exe)
  const releaseInfo = await getLatestReleaseInfo();
  const directExeUrl = releaseInfo.downloadUrl;
  return res.redirect(302, directExeUrl);
});

module.exports = router;
