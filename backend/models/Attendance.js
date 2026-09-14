const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // format: YYYY-MM-DD
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Half Day', 'Leave', 'Absent'],
    default: 'Present'
  },
  clockIn: {
    type: String // HH:MM format, set from attendanceController
  },
  clockOut: {
    type: String // HH:MM format, set on checkout
  },
  autoCheckout: {
    type: Boolean,
    default: false // true when system auto-checked out the employee at 11:59 PM
  }
}, { timestamps: true });

attendanceSchema.index({ user: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
