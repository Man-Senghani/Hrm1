const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Screenshot = require('../models/Screenshot');
const User = require('../models/User');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `screenshot-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// @route   POST /api/screenshot/upload
// @desc    Upload a screenshot
router.post('/upload', async (req, res) => {
  try {
    const { userId, screenshot } = req.body;
    if (!screenshot || !userId) {
      return res.status(400).json({ message: 'Missing screenshot data or userId' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { saveBase64Image } = require('../utils/fileUpload');
    const roleFolder = user.role || 'employee';
    const nameFolder = (user.name || user.fullName || 'unknown').replace(/\s+/g, '_');
    const folderPath = `screenshots/${roleFolder}/${nameFolder}`;
    const screenshotPath = await saveBase64Image(screenshot, folderPath, `screenshot-${userId}`);
    if (!screenshotPath) {
      return res.status(400).json({ message: 'Invalid screenshot data' });
    }

    const newScreenshot = new Screenshot({
      userId,
      employeeName: user.name || user.fullName,
      role: user.role,
      imageUrl: screenshotPath
    });

    await newScreenshot.save();

    // Notify via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      // 1. Notify the specific user
      io.to(`user_${userId}`).emit('screenshot_taken', {
        message: 'System captured a random screenshot'
      });
      
      // 2. Notify Admins/HR for live dashboard update
      io.emit('new_screenshot', newScreenshot);
    }

    res.status(201).json(newScreenshot);
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/screenshot/all
// @desc    Get screenshots based on role
router.get('/all', async (req, res) => {
  try {
    const rawRole = (req.query.role || req.user?.role || '').toLowerCase();
    
    let query = {};
    if (rawRole === 'employee') {
      return res.status(403).json({ message: 'Unauthorized' });
    } else if (rawRole === 'manager') {
      query = { role: 'employee' }; 
    } else if (rawRole === 'hr') {
      query = { role: { $ne: 'admin' } };
    } else if (rawRole === 'admin') {
      query = {};
    }

    const screenshots = await Screenshot.find(query).sort({ timestamp: -1 }).limit(150);
    res.json(screenshots);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
