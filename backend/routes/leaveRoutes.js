const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getManagerLeaves,
  managerApprove,
  getHRLeaves,
  hrApprove,
  rejectLeave,
  cancelLeave,
  getMyLeaves,
  getAllLeaves,
  allocateLeave,
  requestLeaveCancellation
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

// 👤 Employee Routes
router.post('/apply', protect, authorize('employee', 'manager', 'hr', 'admin'), applyLeave);
router.put('/update/:id', protect, require('../controllers/leaveController').updateLeave);
router.get('/my', protect, getMyLeaves);
router.get('/my-quotas', protect, require('../controllers/leaveController').getMyLeaveQuotas);
router.put('/cancel/:id', protect, cancelLeave);
router.post('/request-cancellation/:id', protect, requestLeaveCancellation);

// 👨‍💼 Manager Routes
router.get('/on-leave-today', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getEmployeesOnLeaveToday);
router.get('/upcoming-leaves', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getUpcomingLeavesList);
router.get('/manager/summary', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getManagerStats);
router.get('/manager/pending', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getTeamLeaves);
router.get('/manager/availability', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getAvailabilityStats);
router.get('/manager/calendar', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getManagerCalendar);
router.get('/manager/balances', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getTeamLeaveBalances);
router.get('/manager/monthly-trend', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getLeaveMonthlyTrend);
router.get('/manager/department-analytics', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').getDepartmentAnalytics);
router.put('/manager/bulk-approve', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').bulkApproveLeaves);
router.get('/manager/export', protect, authorize('manager', 'hr', 'admin', 'employee'), require('../controllers/leaveController').exportTeamLeaves);

router.get('/manager', protect, authorize('manager', 'hr', 'admin', 'employee'), getManagerLeaves);
router.put('/manager-approve/:id', protect, authorize('manager', 'hr', 'admin', 'employee'), managerApprove);

// 🧑‍💼 HR Routes
router.get('/hr', protect, authorize('hr', 'admin'), getHRLeaves);
router.put('/hr-approve/:id', protect, authorize('hr', 'admin'), hrApprove);

// ❌ Unified Reject Route
router.put('/reject/:id', protect, authorize('manager', 'hr', 'admin'), rejectLeave);

// 🛡️ HR Override Route
router.put('/override/:id', protect, authorize('hr', 'admin'), require('../controllers/leaveController').hrOverride);

// 📜 Leave History / Transition Audit Route
router.get('/history/:id', protect, require('../controllers/leaveController').getLeaveHistory);

// 💼 HR/Admin Allocation
router.post('/allocate', protect, authorize('hr', 'admin'), allocateLeave);

// 👑 Admin Route
router.get('/', protect, authorize('admin', 'hr'), getAllLeaves);

module.exports = router;
