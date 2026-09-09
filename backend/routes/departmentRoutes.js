const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  reorderDepartments
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getDepartments);
router.post('/', protect, createDepartment);
router.put('/reorder', protect, reorderDepartments);
router.put('/:id', protect, updateDepartment);
router.delete('/:id', protect, deleteDepartment);

module.exports = router;
