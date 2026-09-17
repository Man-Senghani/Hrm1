const mongoose = require('mongoose');

const compOffRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateWorked: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  isFullDay: {
    type: Boolean,
    default: true
  },
  fromTime: {
    type: String
  },
  toTime: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CompOffRequest', compOffRequestSchema);
