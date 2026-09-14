// Deprecated: HR records are unified under User and Employee models
const mongoose = require('mongoose');

const hrSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, { timestamps: true, strict: false });

module.exports = mongoose.models.HR || mongoose.model('HR', hrSchema);
