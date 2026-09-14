const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createReport,
  getMyReports,
  getAllReports,
  getProjectList,
  addProject,
  editProject,
  deleteProject,
  reorderProjects,
  getReportById,
  updateReport,
  deleteReport,
  requestEditAccess,
  reviewEditAccess
} = require('../controllers/dailyReportController');

// Project list and management endpoints
router.get('/projects', protect, getProjectList);
router.post('/projects', protect, authorize('admin', 'hr', 'manager'), addProject);
router.put('/projects/reorder', protect, authorize('admin', 'hr', 'manager'), reorderProjects);
router.put('/projects', protect, authorize('admin', 'hr', 'manager'), editProject);
router.delete('/projects', protect, authorize('admin', 'hr', 'manager'), deleteProject);

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

// Edit access request & review workflows
router.post('/:id/request-edit', protect, requestEditAccess);
router.put('/:id/review-edit', protect, authorize('admin', 'hr', 'manager'), reviewEditAccess);

module.exports = router;
