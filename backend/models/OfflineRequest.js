const mongoose = require('mongoose');

const offlineRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeRole: {
    type: String,
    default: 'employee'
  },
  empId: {
    type: String,
    default: ''
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  recordedInactiveMinutes: {
    type: Number,
    default: 0
  },
  requestedDurationMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  approvedDurationMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewerName: {
    type: String,
    default: ''
  },
  reviewRemarks: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

offlineRequestSchema.index({ employeeId: 1, date: -1 });
offlineRequestSchema.index({ managerId: 1, status: 1 });
offlineRequestSchema.index({ status: 1 });

module.exports = mongoose.model('OfflineRequest', offlineRequestSchema);
