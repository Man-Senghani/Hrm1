// Deprecated: Manager records are unified under User and Employee models
const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, { timestamps: true, strict: false });

module.exports = mongoose.models.Manager || mongoose.model('Manager', managerSchema);
