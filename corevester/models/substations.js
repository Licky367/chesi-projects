const mongoose = require('mongoose');

const substationProductReductionSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  unitsReduced: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lastReducedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const substationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, index: true },
  location: { type: String, trim: true, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },

  // Product.units is the live product availability and is already reduced
  // when the customer reserves/adds the product to a cart. This field is a
  // separate per-substation delivery ledger: it records how many units from
  // this substation have subsequently been fulfilled, without touching
  // Product.units a second time.
  productReductions: {
    type: [substationProductReductionSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Substation', substationSchema);
