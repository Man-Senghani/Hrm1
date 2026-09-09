const express = require('express');
const router = express.Router();
const {
  getSystemRoles,
  createSystemRole,
  updateSystemRole,
  deleteSystemRole,
  reorderSystemRoles
} = require('../controllers/systemRoleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSystemRoles);
router.post('/', protect, createSystemRole);
router.put('/reorder', protect, reorderSystemRoles);
router.put('/:id', protect, updateSystemRole);
router.delete('/:id', protect, deleteSystemRole);

module.exports = router;
