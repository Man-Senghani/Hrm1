const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  department: {
    type: String,
    trim: true,
    default: 'General'
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  workDescription: {
    type: String,
    required: true,
    trim: true
  },
  hoursSpent: {
    type: Number,
    required: true,
    min: 0.1
  },
  reportDate: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['Completed', 'In Progress', 'Pending', 'On Hold'],
    default: 'Completed'
  },
  batchId: {
    type: String,
    trim: true
  },
  projectEntries: [{
    projectName: { type: String, trim: true },
    workDescription: { type: String, trim: true },
    hoursSpent: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['Completed', 'In Progress', 'Pending', 'On Hold'],
      default: 'Completed'
    }
  }],
  editRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    reason: { type: String, trim: true, default: '' },
    requestedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, default: '' }
  }
}, { timestamps: true });

dailyReportSchema.index({ user: 1, reportDate: 1 });
dailyReportSchema.index({ reportDate: 1 });
dailyReportSchema.index({ status: 1 });
dailyReportSchema.index({ department: 1 });
dailyReportSchema.index({ batchId: 1 });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
