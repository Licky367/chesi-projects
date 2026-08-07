const mongoose = require('mongoose');

const farmFinanceSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true,
  },
  costDescription: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {  // <-- NEW
    type: String,
    enum: ['inflow', 'outflow'],
    required: true,
  },
  dateIncurred: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('FarmFinance', farmFinanceSchema);