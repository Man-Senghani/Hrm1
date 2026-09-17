const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  earnedLeave: {
    type: Number,
    default: 1.5
  },
  usedLeave: {
    type: Number,
    default: 0
  },
  remainingLeave: {
    type: Number,
    default: 0
  },
  sickLeave: {
    type: Number,
    default: 0
  },
  casualLeave: {
    type: Number,
    default: 0
  },
  compOff: {
    type: Number,
    default: 0
  },
  otherLeaves: {
    type: Number,
    default: 0
  },
  maternityLeave: {
    type: Number,
    default: 180
  },
  paternityLeave: {
    type: Number,
    default: 15
  },
  carryForward: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Ensure one record per employee per month
leaveBalanceSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
