// ==========================================================
// verrah/models/products.js
// PRODUCT MODEL
//
// FIFO PRODUCT COSTING
// ==========================================================
//
// Product.fifoBatches stores the FIFO cost history of units
// allocated from Stock.
//
// Example:
//
// fifoBatches:
// [
//   {
//     units: 100,
//     buyPrice: 100,
//     receivedAt: Date
//   },
//   {
//     units: 30,
//     buyPrice: 120,
//     receivedAt: Date
//   }
// ]
//
// The oldest product FIFO batch is consumed first.
//
// Product.buyPrice remains the current weighted-average
// purchase cost for compatibility with the existing system.
//
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// DIRECTIONS OF USE ITEM
// ==========================================================

const directionsOfUseItemSchema = new mongoose.Schema(
  {
    subtitle: {
      type: String,
      trim: true,
      default: ""
    },

    content: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    _id: false
  }
);


// ==========================================================
// DIRECTIONS OF USE
// ==========================================================

const directionsOfUseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: ""
    },

    items: {
      type: [directionsOfUseItemSchema],
      default: []
    }
  },
  {
    _id: false
  }
);


// ==========================================================
// PRODUCT FIFO BATCH
// ==========================================================
//
// Each batch represents units received by this Product from
// a Stock FIFO batch.
//
// `units` is the CURRENT remaining quantity in this Product
// FIFO batch.
//
// `buyPrice` is the original cost per unit.
//
// `receivedAt` determines FIFO order.
//
// IMPORTANT:
//
// buyPrice must NEVER be changed after the batch is created.
//
// If:
//
// 100 units @ 100
//
// are allocated and later 30 are consumed:
//
// 70 units @ 100
//
// remains.
//
// A new stock allocation creates another FIFO batch instead
// of changing this existing batch.
// ==========================================================

const fifoBatchSchema = new mongoose.Schema(
  {
    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    buyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    receivedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);


// ==========================================================
// PRODUCT SCHEMA
// ==========================================================

const productSchema = new mongoose.Schema(
  {

    // ========================================================
    // STOCK
    // ========================================================
    //
    // Product belongs to a Stock record.
    //
    // ========================================================

    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true
    },


    // ========================================================
    // PRODUCT NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },


    // ========================================================
    // CATEGORY
    // ========================================================
    //
    // DATABASE:
    //
    // Product.category stores Category._id.
    //
    // FRONTEND:
    //
    // The ObjectId is resolved by productService.
    //
    // The frontend receives:
    //
    //     categoryName
    //
    // instead of:
    //
    //     category._id
    //
    // ========================================================

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },


    // ========================================================
    // SUBCATEGORY
    // ========================================================

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },


    // ========================================================
    // DELIVERY DAYS
    // ========================================================

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },


    // ========================================================
    // IMAGE
    // ========================================================

    image: {
      type: String,
      trim: true,
      default: ""
    },


    // ========================================================
    // AVAILABLE UNITS
    // ========================================================

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },


    // ========================================================
    // BUY PRICE
    // ========================================================
    //
    // This remains for compatibility with the existing
    // application.
    //
    // It represents the CURRENT WEIGHTED-AVERAGE COST of the
    // units held by this Product.
    //
    // Exact FIFO history is stored in fifoBatches.
    //
    // ========================================================

    buyPrice: {
      type: Number,
      min: 0,
      default: 0
    },


    // ========================================================
    // PRODUCT FIFO BATCHES
    // ========================================================
    //
    // Stores the actual FIFO cost layers belonging to this
    // Product.
    //
    // Example:
    //
    // [
    //   {
    //     units: 100,
    //     buyPrice: 100,
    //     receivedAt: ...
    //   },
    //   {
    //     units: 30,
    //     buyPrice: 120,
    //     receivedAt: ...
    //   }
    // ]
    //
    // Total fifoBatches.units must equal Product.units.
    //
    // ========================================================

    fifoBatches: {
      type: [fifoBatchSchema],
      default: []
    },


    // ========================================================
    // SELLING PRICE
    // ========================================================

    unitSellPrice: {
      type: Number,
      required: true,
      min: 0
    },


    // ========================================================
    // DESCRIPTION
    // ========================================================

    description: {
      type: String,
      trim: true,
      default: ""
    },


    // ========================================================
    // DIRECTIONS OF USE
    // ========================================================

    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },


    // ========================================================
    // SUBSTATION
    // ========================================================

    substation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },


    // ========================================================
    // ACTIVE STATUS
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }

  },

  {
    timestamps: true,

    toJSON: {
      virtuals: true
    },

    toObject: {
      virtuals: true
    }
  }
);


// ==========================================================
// INDEXES
// ==========================================================

productSchema.index({
  stock: 1,
  isActive: 1
});

productSchema.index({
  category: 1,
  isActive: 1
});

productSchema.index({
  category: 1,
  subcategory: 1,
  name: 1
});


// ----------------------------------------------------------
// FIFO RECEIVED DATE INDEX
// ----------------------------------------------------------
//
// IMPORTANT:
//
// `receivedAt` is NOT declared with `index: true` inside
// fifoBatchSchema.
//
// This parent-level index is the SINGLE index definition
// for:
//
//     fifoBatches.receivedAt
//
// This prevents the Mongoose duplicate-index warning.
// ----------------------------------------------------------

productSchema.index({
  "fifoBatches.receivedAt": 1
});


// ==========================================================
// FIFO VALIDATION
// ==========================================================
//
// If fifoBatches exist, their remaining units must equal the
// Product.units value.
//
// Legacy Products with no fifoBatches are allowed so that
// existing database records do not immediately become invalid.
//
// The stock/product service is responsible for migrating
// legacy records into FIFO batches when they are used.
// ==========================================================

productSchema.pre(
  "validate",
  function (next) {

    // --------------------------------------------------------
    // LEGACY PRODUCT
    // --------------------------------------------------------
    //
    // No FIFO batches yet.
    //
    // Allow the record so existing products continue working.
    //
    if (
      !Array.isArray(this.fifoBatches) ||
      this.fifoBatches.length === 0
    ) {
      return next();
    }


    // --------------------------------------------------------
    // CALCULATE FIFO UNITS
    // --------------------------------------------------------

    const fifoUnits =
      this.fifoBatches.reduce(
        (total, batch) =>
          total +
          Number(batch.units || 0),
        0
      );


    // --------------------------------------------------------
    // VERIFY FIFO TOTAL
    // --------------------------------------------------------

    if (
      fifoUnits !==
      Number(this.units || 0)
    ) {
      return next(
        new Error(
          "Product FIFO batch units must equal product units."
        )
      );
    }


    next();
  }
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = mongoose.model(
  "Product",
  productSchema
);