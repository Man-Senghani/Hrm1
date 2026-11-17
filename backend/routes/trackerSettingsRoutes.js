const express = require('express');
const router = express.Router();
const TrackerSettings = require('../models/TrackerSettings');
const { protect, authorize } = require('../middleware/authMiddleware');

// Default fallback settings
const DEFAULT_SETTINGS = {
  screenshotIntervalMinutes: 15,
  inactivityTimeoutMinutes: 10
};

/**
 * @route   GET /api/tracker-settings
 * @desc    Get current desktop tracker configuration
 * @access  Public / Authenticated
 */
router.get('/', async (req, res) => {
  try {
    let settings = await TrackerSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = await TrackerSettings.create(DEFAULT_SETTINGS);
    }
    return res.json({
      success: true,
      settings: {
        screenshotIntervalMinutes: settings.screenshotIntervalMinutes,
        inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
        updatedAt: settings.updatedAt,
        updatedByName: settings.updatedByName || 'System'
      }
    });
  } catch (err) {
    console.error('Error fetching tracker settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tracker settings',
      settings: DEFAULT_SETTINGS
    });
  }
});

/**
 * @route   PUT /api/tracker-settings
 * @desc    Update desktop tracker configuration
 * @access  Private (Admin & HR)
 */
router.put('/', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    let { screenshotIntervalMinutes, inactivityTimeoutMinutes } = req.body;

    screenshotIntervalMinutes = parseInt(screenshotIntervalMinutes, 10);
    inactivityTimeoutMinutes = parseInt(inactivityTimeoutMinutes, 10);

    if (isNaN(screenshotIntervalMinutes) || screenshotIntervalMinutes < 1 || screenshotIntervalMinutes > 120) {
      return res.status(400).json({
        success: false,
        message: 'Screenshot interval must be a valid number between 1 and 120 minutes.'
      });
    }

    if (isNaN(inactivityTimeoutMinutes) || inactivityTimeoutMinutes < 1 || inactivityTimeoutMinutes > 60) {
      return res.status(400).json({
        success: false,
        message: 'Inactivity timeout must be a valid number between 1 and 60 minutes.'
      });
    }

    const updaterName = req.user?.name || req.user?.fullName || req.user?.email || 'Admin/HR';
    const updaterId = req.user?._id || req.user?.id;

    let settings = await TrackerSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      settings = new TrackerSettings({
        screenshotIntervalMinutes,
        inactivityTimeoutMinutes,
        updatedBy: updaterId,
        updatedByName: updaterName
      });
    } else {
      settings.screenshotIntervalMinutes = screenshotIntervalMinutes;
      settings.inactivityTimeoutMinutes = inactivityTimeoutMinutes;
      settings.updatedBy = updaterId;
      settings.updatedByName = updaterName;
    }

    await settings.save();

    // Broadcast update via Socket.io to all live connected desktop clients
    const io = req.app.get('io');
    if (io) {
      io.emit('tracker_settings_updated', {
        screenshotIntervalMinutes: settings.screenshotIntervalMinutes,
        inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
        updatedAt: settings.updatedAt
      });
    }

    return res.json({
      success: true,
      message: 'Tracker configuration updated successfully.',
      settings: {
        screenshotIntervalMinutes: settings.screenshotIntervalMinutes,
        inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
        updatedAt: settings.updatedAt,
        updatedByName: settings.updatedByName
      }
    });
  } catch (err) {
    console.error('Error updating tracker settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tracker settings',
      error: err.message
    });
  }
});

module.exports = router;

