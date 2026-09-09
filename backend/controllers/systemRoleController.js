const SystemRole = require('../models/SystemRole');

const DEFAULT_SYSTEM_ROLES = [
  {
    roleKey: 'admin',
    label: 'System Admin',
    description: 'Full system access, user management, and all configurations.',
    icon: '🛡️',
    isSystem: true,
    order: 0
  },
  {
    roleKey: 'hr',
    label: 'HR Officer',
    description: 'Manage employees, recruitment, payroll, and leave policies.',
    icon: '🧑‍💼',
    isSystem: true,
    order: 1
  },
  {
    roleKey: 'manager',
    label: 'Manager',
    description: 'Oversee team tasks, attendance, and performance reviews.',
    icon: '👔',
    isSystem: true,
    order: 2
  },
  {
    roleKey: 'employee',
    label: 'Employee',
    description: 'Access own dashboard, reports, leave requests, and chat.',
    icon: '🧑‍💻',
    isSystem: true,
    order: 3
  }
];

exports.getSystemRoles = async (req, res) => {
  try {
    let roles = await SystemRole.find().sort({ order: 1, createdAt: 1 }).lean();
    if (!roles || roles.length === 0) {
      await SystemRole.insertMany(DEFAULT_SYSTEM_ROLES);
      roles = await SystemRole.find().sort({ order: 1, createdAt: 1 }).lean();
    }
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSystemRole = async (req, res) => {
  try {
    const { label, description, icon } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ message: 'Role label is required' });
    }
    const cleanLabel = label.trim();
    const roleKey = cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const count = await SystemRole.countDocuments();
    const newRole = new SystemRole({
      roleKey,
      label: cleanLabel,
      description: (description || '').trim(),
      icon: icon || '🔖',
      isSystem: false,
      order: count
    });
    await newRole.save();
    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSystemRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, description, icon } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ message: 'Role label is required' });
    }
    const updated = await SystemRole.findByIdAndUpdate(
      id,
      {
        label: label.trim(),
        description: (description || '').trim(),
        ...(icon ? { icon } : {})
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSystemRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await SystemRole.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ message: 'Core system roles cannot be deleted' });
    }
    await SystemRole.findByIdAndDelete(id);
    res.json({ message: 'System role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reorderSystemRoles = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds array is required' });
    }
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } }
      }
    }));
    if (bulkOps.length > 0) {
      await SystemRole.bulkWrite(bulkOps);
    }
    const roles = await SystemRole.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
