const mongoose = require("mongoose");

// ==================================================
// MAIN MILK SCHEMA
// ==================================================

const milkSchema = new mongoose.Schema(
  {

    // =========================
    // PRODUCTION RECORD
    // =========================

    dairy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dairy",
      required: true,
      index: true
    },

    // =========================
    // WHO RECORDED IT
    // =========================

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    recordedByType: {
      type: String,
      enum: ["user", "system"],
      default: "user",
      index: true
    },

    // =========================
    // MILK DATA
    // =========================

    liters: {
      type: Number,
      required: true,
      min: 0
    },

    remarks: {
      type: String,
      default: "",
      trim: true
    },

    // =========================
    // DATE
    // =========================

    date: {
      type: Date,
      default: Date.now,
      index: true
    },

    day: {
      type: String,
      index: true
    },

    month: {
      type: String,
      index: true
    },

    // =========================
    // MILKING SESSION
    // =========================

    session: {
      type: String,
      enum: ["morning", "evening"],
      required: true,
      index: true
    }

  },
  {
    timestamps: true,
    minimize: false
  }
);

// ==================================================
// NORMALIZE DATE KEYS
// USING AFRICA/NAIROBI / EAT
// ==================================================

milkSchema.pre("save", function(next) {

  const d = new Date(this.date);

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );

  const day =
    formatter.format(d);

  this.day = day;

  this.month =
    day.slice(0, 7);

  next();

});

// ==================================================
// DAILY REPORT
// ==================================================

milkSchema.statics.getDailyReport = async function(day) {

  const records =
    await this.find({
      day
    })
      .populate("dairy")
      .populate("recordedBy", "name")
      .lean();

  const total =
    records.reduce(

      (sum, record) =>

        sum +
        Number(record.liters || 0),

      0

    );

  return {

    records,

    stats: {

      total

    }

  };

};

// ==================================================
// MONTHLY REPORT
// ==================================================

milkSchema.statics.getMonthlyReport = async function(month) {

  const grouped =
    await this.aggregate([

      {
        $match: {
          month
        }
      },

      {
        $group: {

          _id: "$dairy",

          total: {
            $sum: "$liters"
          },

          days: {
            $addToSet: "$day"
          }

        }
      },

      {
        $project: {

          dairy: "$_id",

          total: 1,

          avg: {

            $cond: [

              {
                $gt: [
                  {
                    $size: "$days"
                  },
                  0
                ]
              },

              {
                $divide: [
                  "$total",
                  {
                    $size: "$days"
                  }
                ]
              },

              0

            ]

          }

        }

      }

    ]);

  return {

    records: grouped

  };

};

// ==================================================
// INDEXES
// ==================================================

// One morning record and one evening record
// per animal per day.

milkSchema.index(
  {
    dairy: 1,
    day: 1,
    session: 1
  },
  {
    unique: true
  }
);

// ==================================================

milkSchema.index({

  dairy: 1,

  month: 1

});

// ==================================================

milkSchema.index({

  date: -1

});

// ==================================================
// EXPORT
// ==================================================

module.exports =
  mongoose.model(
    "Milk",
    milkSchema
  );