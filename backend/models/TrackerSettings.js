const mongoose = require('mongoose');

const trackerSettingsSchema = new mongoose.Schema({
  screenshotIntervalMinutes: {
    type: Number,
    default: 15,
    min: 1,
    max: 120,
    required: true
  },
  inactivityTimeoutMinutes: {
    type: Number,
    default: 10,
    min: 1,
    max: 60,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedByName: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TrackerSettings', trackerSettingsSchema);

