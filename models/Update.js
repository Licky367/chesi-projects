const mongoose = require("mongoose");


/* =========================================================
   COMMENT SUB-SCHEMA
========================================================= */

const commentSchema = new mongoose.Schema({

  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  userName: {
    type: String,
    trim: true,
    required: true
  },

  userImage: {
    type: String,
    default: ""
  },

  text: {
    type: String,
    trim: true,
    maxlength: 1000,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

}, {
  _id: false
});


/* =========================================================
   MAINTENANCE SUB-SCHEMA
========================================================= */

const maintenanceSchema = new mongoose.Schema({

  status: {
    type: String,
    enum: ["marked", "cleared"],
    required: true
  },

  type: {
    type: String,
    enum: [
      "repair",
      "maintenance",
      "construction"
    ],
    default: "maintenance"
  },

  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ""
  },

  markedAt: {
    type: Date,
    default: null
  },

  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  clearedAt: {
    type: Date,
    default: null
  },

  clearedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  charges: {
    type: Number,
    min: 0,
    default: 0
  },

  clearDescription: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ""
  }

}, {
  _id: false
});


/* =========================================================
   MEDICAL SUB-SCHEMA
========================================================= */

const medicalSchema = new mongoose.Schema({

  status: {
    type: String,
    enum: ["marked", "cleared"],
    required: true
  },

  type: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ""
  },

  details: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ""
  },

  markedAt: {
    type: Date,
    default: null
  },

  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  clearedAt: {
    type: Date,
    default: null
  },

  clearedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  charges: {
    type: Number,
    min: 0,
    default: 0
  },

  clearDescription: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ""
  }

}, {
  _id: false
});


/* =========================================================
   MAIN UPDATE SCHEMA
========================================================= */

const updateSchema = new mongoose.Schema({

  /* =====================================================
     RELATIONSHIPS
  ===================================================== */

  dairy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dairy",
    required: true,
    index: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  userName: {
    type: String,
    trim: true,
    default: ""
  },

  userImage: {
    type: String,
    default: ""
  },
  /* =====================================================
     UPDATE TYPE
  ===================================================== */

type: {
  type: String,
  enum: [
    "image",
    "comment",
    "post",

    "medical",
    "medical_mark",
    "medical_clear",

    "maintenance",
    "maintenance_mark",
    "maintenance_clear",

    "milk"
  ],
  required: true
},


  /* =====================================================
     LEGACY COMMENT
  ===================================================== */

  comment: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ""
  },


  /* =====================================================
     POST CONTENT
  ===================================================== */

  text: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ""
  },

  image: {
    type: String,
    default: null
  },


  /* =====================================================
     SOCIAL FEATURES
  ===================================================== */

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  comments: {
    type: [commentSchema],
    default: []
  },


  /* =====================================================
     MAINTENANCE RECORD
  ===================================================== */

  maintenance: {
    type: maintenanceSchema,
    default: undefined
  },


  /* =====================================================
     MEDICAL RECORD
  ===================================================== */

  medical: {
    type: medicalSchema,
    default: undefined
  },


  /* =====================================================
     LEGACY MEDICAL
     (Backward Compatibility)
  ===================================================== */

  legacyMedical: {

    isMarked: {
      type: Boolean,
      default: false
    },

    type: {
      type: String,
      default: ""
    },

    details: {
      type: String,
      default: ""
    },

    markedAt: {
      type: Date,
      default: null
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }

  }

}, {

  timestamps: true,

  minimize: false,

  toJSON: {
    virtuals: true
  },

  toObject: {
    virtuals: true
  }

});
/* =========================================================
   PRE-VALIDATE
========================================================= */

updateSchema.pre("validate", function (next) {

  // Always initialize arrays
  if (!Array.isArray(this.likes)) {
    this.likes = [];
  }

  if (!Array.isArray(this.comments)) {
    this.comments = [];
  }

  // Only posts should carry post content
  if (this.type !== "post") {
    this.text = this.text || "";
    this.image = this.image || null;
  }

  // Maintenance updates
  if (this.type === "maintenance") {

    if (!this.maintenance) {
      this.maintenance = {};
    }

    this.medical = undefined;

  }

// Medical updates
else if (this.type === "medical") {

  if (!this.medical) {
    this.medical = {
      status: "marked"
    };
  }

  this.maintenance = undefined;

}

  // All other update types
  else {

    this.maintenance = undefined;
    this.medical = undefined;

  }

  next();

});


/* =========================================================
   PRE-SAVE
========================================================= */

updateSchema.pre("save", function (next) {

  if (!this.userName && this.populated("user")) {
    this.userName = this.user?.name || "";
  }

  next();

});


/* =========================================================
   INDEXES
========================================================= */

updateSchema.index({
  dairy: 1,
  createdAt: -1
});

updateSchema.index({
  type: 1
});

updateSchema.index({
  user: 1
});

updateSchema.index({
  "maintenance.status": 1
});

updateSchema.index({
  "medical.status": 1
});

updateSchema.index({
  "legacyMedical.isMarked": 1
});


/* =========================================================
   EXPORT
========================================================= */

module.exports = mongoose.model(
  "Update",
  updateSchema
);