const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  getEmployeesByManager
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const upload = require('../middleware/upload');

router.get('/', protect, getEmployees);
router.get('/events', protect, (req, res) => {
  const { getUpcomingEvents } = require('../controllers/employeeController');
  getUpcomingEvents(req, res);
});
router.post('/', protect, authorize('admin', 'hr'), createEmployee);
router.get('/:id', protect, getEmployeeById);
router.put('/:id', protect, authorize('admin', 'hr', 'manager'), updateEmployee);
router.post('/:id/profile-image', protect, authorize('admin', 'hr'), (req, res) => {
  const { updateEmployeeProfileImage } = require('../controllers/employeeController');
  updateEmployeeProfileImage(req, res);
});
router.post('/:id/adhar-card', protect, authorize('admin', 'hr', 'employee'), (req, res) => {
  const { updateEmployeeDocument } = require('../controllers/employeeController');
  updateEmployeeDocument(req, res, 'adharCard');
});
router.post('/:id/bank-details', protect, authorize('admin', 'hr', 'employee'), (req, res) => {
  const { updateEmployeeDocument } = require('../controllers/employeeController');
  updateEmployeeDocument(req, res, 'bankDetails');
});
router.post('/:id/pan-card', protect, authorize('admin', 'hr', 'employee'), (req, res) => {
  const { updateEmployeeDocument } = require('../controllers/employeeController');
  updateEmployeeDocument(req, res, 'panCard');
});
router.delete('/:id', protect, authorize('admin', 'hr'), deleteEmployee);
router.patch('/:id/status', protect, authorize('admin', 'hr', 'manager'), updateEmployeeStatus);
router.put('/:id/status', protect, authorize('admin', 'hr', 'manager'), updateEmployeeStatus);
router.get('/manager/:managerId', protect, authorize('admin', 'hr', 'manager'), getEmployeesByManager);

module.exports = router;
