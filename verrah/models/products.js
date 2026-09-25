// ==========================================================
// verrah/models/products.js
// PRODUCT MODEL
//
// FIFO PRODUCT COSTING
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// DIRECTIONS OF USE ITEM SCHEMA
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
// DIRECTIONS OF USE SCHEMA
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
// FIFO BATCH SCHEMA
//
// Product FIFO batches represent product inventory.
//
// For staff-created batches:
//
//     StaffFIFOsubstation
//         |
//         v
//     Assigned staff substation
//
// For warehouse/admin FIFO batches:
//
//     StaffFIFOsubstation = null
//
// IMPORTANT:
// StaffFIFOsubstation must be assigned by the backend from
// authenticated user.assignedSubstation.
// It must never be trusted from req.body.
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
    },

    StaffFIFOsubstation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
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
    // ------------------------------------------------------
    // SOURCE STOCK
    // ------------------------------------------------------

    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true
    },


    // ------------------------------------------------------
    // PRODUCT INFORMATION
    // ------------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },

    image: {
      type: String,
      trim: true,
      default: ""
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },


    // ------------------------------------------------------
    // INVENTORY
    // ------------------------------------------------------

    /*
     * Product.units must equal the total units contained
     * in fifoBatches.
     */

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },


    // ------------------------------------------------------
    // CURRENT / LEGACY BUY PRICE
    // ------------------------------------------------------

    buyPrice: {
      type: Number,
      min: 0,
      default: 0
    },


    // ------------------------------------------------------
    // PRODUCT FIFO
    // ------------------------------------------------------

    fifoBatches: {
      type: [fifoBatchSchema],
      default: []
    },


    // ------------------------------------------------------
    // SELLING PRICE
    // ------------------------------------------------------

    unitSellPrice: {
      type: Number,
      required: true,
      min: 0
    },


    // ------------------------------------------------------
    // DIRECTIONS OF USE
    // ------------------------------------------------------

    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },


    // ------------------------------------------------------
    // DEFAULT / ASSOCIATED SUBSTATION
    // ------------------------------------------------------

    substation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },


    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

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

productSchema.index({
  "fifoBatches.receivedAt": 1
});

productSchema.index({
  "fifoBatches.StaffFIFOsubstation": 1
});


// ==========================================================
// FIFO VALIDATION
//
// Product.units must equal the sum of all FIFO batch units.
//
// Example:
//
//     fifoBatches:
//         10
//         20
//         15
//
//     Product.units:
//         45
//
// Staff substation ownership does not change this rule.
// ==========================================================

productSchema.pre("validate", function (next) {

  if (
    !Array.isArray(this.fifoBatches) ||
    this.fifoBatches.length === 0
  ) {
    return next();
  }


  const fifoUnits =
    this.fifoBatches.reduce(
      (total, batch) => {

        return (
          total +
          Number(batch.units || 0)
        );

      },
      0
    );


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

});


// ==========================================================
// FIFO CURRENT BATCH
//
// FIFO order is determined by receivedAt.
//
// The oldest batch with available units is the current
// costing batch.
// ==========================================================

productSchema.methods.getCurrentBatch =
  function () {

    if (
      !Array.isArray(this.fifoBatches) ||
      !this.fifoBatches.length
    ) {
      return null;
    }


    const available =
      this.fifoBatches
        .filter(
          batch =>
            Number(batch.units || 0) > 0
        )
        .sort(
          (a, b) =>
            new Date(a.receivedAt) -
            new Date(b.receivedAt)
        );


    return available[0] || null;
  };


// ==========================================================
// CURRENT FIFO PRICE
// ==========================================================

productSchema.methods.getCurrentPrice =
  function () {

    const batch =
      this.getCurrentBatch();


    if (batch) {

      return Number(
        batch.buyPrice || 0
      );

    }


    /*
     * Legacy fallback.
     */

    return Number(
      this.buyPrice || 0
    );
  };


// ==========================================================
// CURRENT FIFO BATCH UNITS
// ==========================================================

productSchema.methods.getCurrentBatchUnits =
  function () {

    const batch =
      this.getCurrentBatch();


    if (batch) {

      return Number(
        batch.units || 0
      );

    }


    return Number(
      this.units || 0
    );
  };


// ==========================================================
// VIRTUAL: CURRENT BATCH PRICE
// ==========================================================

productSchema.virtual(
  "currentBatchPrice"
).get(
  function () {

    return this.getCurrentPrice();

  }
);


// ==========================================================
// VIRTUAL: CURRENT BATCH
// ==========================================================

productSchema.virtual(
  "currentBatch"
).get(
  function () {

    return this.getCurrentBatch();

  }
);


// ==========================================================
// VIRTUAL: CURRENT BATCH UNITS
// ==========================================================

productSchema.virtual(
  "currentBatchUnits"
).get(
  function () {

    return this.getCurrentBatchUnits();

  }
);


// ==========================================================
// MODEL
// ==========================================================

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );