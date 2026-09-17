const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['sick', 'casual', 'earned', 'emergency', 'maternity', 'paternity', 'comp-off', 'on-duty']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'cancellation_pending'],
    default: 'pending'
  },
  cancellationReason: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  totalDays: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

leaveSchema.index({ user: 1, status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
