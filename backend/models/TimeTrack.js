const mongoose = require('mongoose');

const timeTrackSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  employeeRole: {
    type: String,
    required: true,
    enum: ['employee', 'manager', 'hr', 'admin']
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  activeTime: {
    type: Number, // in seconds
    default: 0
  },
  idleTime: {
    type: Number, // in seconds
    default: 0
  },
  lastActiveTime: {
    type: Date,
    default: Date.now
  },
  // v2 Time Engine fields
  segmentStart: {
    type: Date,
    default: null
  },
  idleStart: {
    type: Date,
    default: null
  },
  lastHeartbeat: {
    type: Date,
    default: null
  },
  totalTime: {
    type: Number, // total session duration in seconds (active + idle)
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'idle', 'completed'],
    default: 'active'
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  isAutoStop: {
    type: Boolean,
    default: false
  },
  totalActiveTime: {
    type: Number, // in seconds, accumulated from previous segments
    default: 0
  },
  idleApplied: {
    type: Boolean,
    default: false
  },
  inactivityCount: {
    type: Number,
    default: 0
  },
  sessions: [{
    start: { type: Date },
    pause: { type: Date },
    resume: { type: Date },
    end: { type: Date }
  }]
}, { timestamps: true });

// Index for fast lookups
timeTrackSchema.index({ employeeId: 1, date: 1, createdAt: -1 });
timeTrackSchema.index({ managerId: 1, date: 1 });
timeTrackSchema.index({ employeeRole: 1, date: -1, createdAt: -1 });
timeTrackSchema.index({ date: -1, createdAt: -1 });
timeTrackSchema.index({ status: 1 });

module.exports = mongoose.model('TimeTrack', timeTrackSchema);
