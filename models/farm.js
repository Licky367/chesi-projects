const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  initialCost: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  expectedCompletionDate: {
    type: Date,
    required: true,
  },
  goalsObjectives: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Not Begun', 'Begun', 'Completed'],
    default: 'Not Begun',
  },
}, { timestamps: true });

module.exports = mongoose.model('Farm', farmSchema);