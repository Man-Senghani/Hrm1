const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: { type: String, unique: true },
  fullName: String,
  email: { type: String, trim: true, lowercase: true },
  role: String,
  personalEmail: { type: String, trim: true, lowercase: true },
  phone: String,
  gender: { type: String, default: 'Male' },
  dob: Date,
  address: String,
  localAddress: String,
  permanentAddress: String,
  joinDate: Date,
  employmentType: { type: String, default: 'Full-time' },
  profileImage: { type: String, default: null },
  adharCard: { type: String, default: null },
  bankDetails: { type: String, default: null },
  panCard: { type: String, default: null },
  status: { type: String, default: 'active' },
  position: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

employeeSchema.index({ status: 1 });
employeeSchema.index({ role: 1, status: 1 });
employeeSchema.index({ managerId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ personalEmail: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
