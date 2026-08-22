const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  location: {
    type: String,
    required: true
  },
  applicants: {
    type: Number,
    default: 0
  },
  shortlisted: {
    type: Number,
    default: 0
  },
  interviews: {
    type: Number,
    default: 0
  },
  offers: {
    type: Number,
    default: 0
  },
  hired: {
    type: Number,
    default: 0
  },
  hiringManager: {
    type: String,
    required: true
  },
  datePosted: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  deadline: {
    type: String,
    required: true
  },
  salaryRange: {
    type: String
  },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'On Hold'],
    default: 'Open'
  },
  description: {
    type: String
  },
  requirements: [String]
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
