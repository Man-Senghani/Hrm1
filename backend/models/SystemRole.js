const mongoose = require('mongoose');

const systemRoleSchema = new mongoose.Schema({
  roleKey: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '🔖' },
  isSystem: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SystemRole', systemRoleSchema);
