const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createReport,
  getMyReports,
  getAllReports,
  getProjectList,
  getReportById,
  updateReport,
  deleteReport
} = require('../controllers/dailyReportController');

// Project list endpoint
router.get('/projects', protect, getProjectList);

// Employee own reports endpoint
router.get('/me', protect, getMyReports);

// Higher authority reports list (Admin, HR, Manager)
router.get('/', protect, authorize('admin', 'hr', 'manager'), getAllReports);

// Create report
router.post('/', protect, createReport);

// Individual report operations
router.get('/:id', protect, getReportById);
router.put('/:id', protect, updateReport);
router.delete('/:id', protect, deleteReport);

module.exports = router;
