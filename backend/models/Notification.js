const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  senderName: {
    type: String,
  },
  senderRole: {
    type: String,
  },
  batchId: {
    type: String,
  },
  targetLabel: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'announcement'
  },
  title: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: null
  },
  read: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
