const express = require('express');
const router = express.Router();
const leavePolicyController = require('../controllers/leavePolicyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, leavePolicyController.getPolicies);
router.post('/', protect, authorize('admin', 'hr'), leavePolicyController.createPolicy);
router.put('/:id', protect, authorize('admin', 'hr'), leavePolicyController.updatePolicy);
router.delete('/:id', protect, authorize('admin', 'hr'), leavePolicyController.deletePolicy);

module.exports = router;
