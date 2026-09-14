const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: String,
  role: String,
  imageUrl: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 604800 // 7 days (1 week) in seconds (7 * 24 * 60 * 60)
  }
}, { timestamps: true });

// Ensure cleanup index is updated for 7 days retention
screenshotSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Screenshot', screenshotSchema);
