const Department = require('../models/Department');

const DEFAULT_DEPARTMENTS = [
  { name: 'Engineering', description: 'Product engineering, software development, and technical operations', order: 0 },
  { name: 'Sales', description: 'Direct sales, client acquisition, and account management', order: 1 },
  { name: 'Marketing', description: 'Brand strategy, growth campaigns, and public relations', order: 2 },
  { name: 'Finance', description: 'Treasury, accounting, budgeting, and payroll operations', order: 3 },
  { name: 'HR', description: 'People operations, talent recruitment, and workplace policies', order: 4 },
  { name: 'Design', description: 'UI/UX design, visual identity, and brand creative assets', order: 5 },
  { name: 'Operations', description: 'Business administration, office logistics, and internal processes', order: 6 }
];

exports.getDepartments = async (req, res) => {
  try {
    let departments = await Department.find().sort({ order: 1, createdAt: 1 }).lean();
    if (!departments || departments.length === 0) {
      await Department.insertMany(DEFAULT_DEPARTMENTS);
      departments = await Department.find().sort({ order: 1, createdAt: 1 }).lean();
    }
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, managerId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const count = await Department.countDocuments();
    const newDept = new Department({
      name: name.trim(),
      description: (description || '').trim(),
      managerId,
      order: count
    });
    await newDept.save();
    res.status(201).json(newDept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, managerId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const updated = await Department.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: (description || '').trim(),
        ...(managerId !== undefined ? { managerId } : {})
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Department.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reorderDepartments = async (req, res) => {
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
      await Department.bulkWrite(bulkOps);
    }
    const departments = await Department.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
