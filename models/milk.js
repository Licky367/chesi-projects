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

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

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
    }

  },
  {
    timestamps: true,
    minimize: false
  }
);

// ==================================================
// NORMALIZE DATE KEYS
// ==================================================

milkSchema.pre("save", function(next) {

  const d = new Date(this.date);

  this.day =
    d.toISOString().split("T")[0];

  this.month =
    this.day.slice(0, 7);

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

milkSchema.index({

  dairy: 1,

  day: 1

});

milkSchema.index({

  dairy: 1,

  month: 1

});

milkSchema.index({

  date: -1

});

// ==================================================
// EXPORT
// ==================================================

module.exports = mongoose.model(

  "Milk",

  milkSchema

);