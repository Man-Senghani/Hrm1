const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  startTracking,
  pauseTracking,
  resumeTracking,
  stopTracking,
  updateActivity,
  getMyTime,
  getHRTime,
  getAllTime,
  getAllTimeLogs,
  exportTimeLogs,
  getSessionStatus,
  getTimeSummary,
  getLogs,
  getTimeByDate,
  getDashboardData,
  getCalendarData,
  getDailyData,
  getDailySummaryLogs,
  submitOfflineRequest,
  getOfflineRequests,
  updateOfflineRequestStatus
} = require('../controllers/timeTrackController');

// 🟢 Session Control
router.post('/start', protect, startTracking);
router.post('/pause', protect, pauseTracking);
router.post('/resume', protect, resumeTracking);
router.post('/stop', protect, stopTracking);

// 🔄 Monitoring
router.post('/activity', protect, updateActivity);
router.post('/update', protect, updateActivity); // Alias as requested
router.get('/status', protect, getSessionStatus);
router.get('/timer/status', protect, getSessionStatus); // Alias as requested
router.post('/timer/update', protect, updateActivity); // Alias as requested

// 📋 Meeting / Offline Activity Requests
router.post('/offline-request', protect, submitOfflineRequest);
router.get('/offline-requests', protect, getOfflineRequests);
router.put('/offline-request/:id/status', protect, authorize('admin', 'hr', 'manager'), updateOfflineRequestStatus);

// 📊 Analytics & History
router.get('/my', protect, getMyTime);
router.get('/summary', protect, getTimeSummary);
router.get('/logs', protect, getLogs);
router.get('/date/:date', protect, getTimeByDate);
router.get('/calendar/:employeeId', protect, getCalendarData);
router.get('/daily/:employeeId/:date', protect, getDailyData);
router.get('/daily-summary/:employeeId', protect, getDailySummaryLogs);
// 🚀 UNIFIED DASHBOARD
router.get('/dashboard', protect, getDashboardData);

// 👨‍💼 Role-Based Views
router.get('/hr', protect, authorize('hr', 'admin', 'manager'), getHRTime);
router.get('/all', protect, authorize('admin', 'hr', 'manager'), getAllTime);
router.get('/all-logs', protect, authorize('hr', 'admin', 'superadmin', 'manager'), getAllTimeLogs);
router.get('/export', protect, authorize('hr', 'admin', 'superadmin', 'manager'), exportTimeLogs);

module.exports = router;
