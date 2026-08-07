const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");

// =======================.===========================
// GET MILKING ANIMALS
// USED ON MILK COLLECTION PAGE
// ==================================================

exports.getMilkingAnimals = async () => {

  return Dairy.find({

    isMilking: true,

    code: {

      $gte: 0,

      $mod: [2, 0]

    }

  })
    .sort({

      code: 1

    })
    .lean();

};

// ==================================================
// SAVE MILK RECORDS
// ==================================================

exports.saveMilkRecords = async (

  records,

  userId

) => {

  if (

    !Array.isArray(records) ||

    !records.length

  ) {

    return [];

  }

  if (!userId) {

    throw new Error(

      "User ID is required to record milk."

    );

  }

  const now = new Date();

  const day =
    now.toISOString().split("T")[0];

  const month =
    day.slice(0, 7);

  const docs = [];

  for (const record of records) {

    if (

      !record.dairy ||

      Number(record.liters) <= 0

    ) {

      continue;

    }

    docs.push({

      dairy: record.dairy,

      liters: Number(record.liters),

      remarks: record.remarks || "",

      recordedBy: userId,

      date: now,

      day,

      month

    });

  }

  if (!docs.length) {

    return [];

  }

  return Milk.insertMany(docs);

};

// ==================================================
// GET CURRENT PRICE
// ==================================================

exports.getCurrentPrice = async () => {

  const latest =
    await MilkSummary
      .findOne({

        price: {

          $gt: 0

        }

      })
      .sort({

        day: -1

      })
      .lean();

  return latest?.price || 50;

};

// ==================================================
// TOGGLE MILKING STATUS
// ==================================================

exports.toggleMilkingStatus = async ({

  dairyId,

  user

}) => {

  if (

    !user ||

    user.role !== "admin"

  ) {

    throw new Error(

      "Unauthorized. Only administrators can change milking status."

    );

  }

  if (

    !mongoose.Types.ObjectId.isValid(

      dairyId

    )

  ) {

    throw new Error(

      "Invalid dairy animal ID."

    );

  }

  const dairy =
    await Dairy.findById(
      dairyId
    );

  if (!dairy) {

    throw new Error(

      "Dairy animal not found."

    );

  }

  if (

    dairy.code < 0 ||

    dairy.code % 2 !== 0

  ) {

    throw new Error(

      "Only female animals can be marked as milking."

    );

  }

  dairy.isMilking =
    !dairy.isMilking;

  await dairy.save();

  return dairy;

};

// ==================================================
// GET DAILY STATS
// ==================================================

exports.getDailyStats = async (day) => {

  const report =
    await Milk.getDailyReport(day);

  let summary =
    await MilkSummary.findOne({

      day

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day,

        month: day.slice(0, 7),

        price: 50,

        consumed: 0,

        available:
          report.stats.total || 0,

        cash: 0,

        locked: false,

        sales: []

      });

  }

  const sales =
    summary.sales || [];

  const consumed =
    sales.reduce(

      (sum, sale) =>

        sum +
        Number(
          sale.liters || 0
        ),

      0

    );

  const available =
    Math.max(

      0,

      Number(
        report.stats.total || 0
      ) - consumed

    );

  const cash =
    sales.reduce(

      (sum, sale) =>

        sum +
        Number(
          sale.cash || 0
        ),

      0

    );

  if (

    summary.consumed !== consumed ||

    summary.available !== available ||

    summary.cash !== cash

  ) {

    summary.consumed =
      consumed;

    summary.available =
      available;

    summary.cash =
      cash;

    await summary.save();

  }

  return {

    records:
      report.records || [],

    sales,

    stats: {

      total:
        report.stats.total || 0,

      consumed,

      available,

      price:
        summary.price || 50,

      cash,

      locked:
        summary.locked || false

    }

  };

};
// ==================================================
// GET MONTHLY STATS
// ==================================================

exports.getMonthlyStats = async (month) => {

  const report =
    await Milk.getMonthlyReport(month);

  const dairies =
    await Dairy.find().lean();

  const dairyMap = {};

  dairies.forEach(dairy => {

    dairyMap[
      dairy._id.toString()
    ] = dairy;

  });

  const records =
    (report.records || []).map(record => ({

      dairy:
        dairyMap[
          record.dairy.toString()
        ] || null,

      total:
        record.total,

      avg:
        record.avg

    }));

  const summaries =
    await MilkSummary.find({

      month

    }).lean();

  let totalConsumed = 0;

  let totalCash = 0;

  let totalPrice = 0;

  const sales = [];

  summaries.forEach(summary => {

    totalPrice +=
      Number(summary.price || 0);

    (summary.sales || []).forEach(sale => {

      totalConsumed +=
        Number(
          sale.liters || 0
        );

      totalCash +=
        Number(
          sale.cash || 0
        );

      sales.push(sale);

    });

  });

  const totalProduced =
    records.reduce(

      (sum, record) =>

        sum +
        Number(
          record.total || 0
        ),

      0

    );

  return {

    records,

    sales,

    stats: {

      total:
        totalProduced,

      consumed:
        totalConsumed,

      available:
        Math.max(

          0,

          totalProduced -
          totalConsumed

        ),

      price:

        summaries.length

          ? totalPrice /
            summaries.length

          : 50,

      cash:
        totalCash,

      locked: false,

      avg:

        records.length

          ? totalProduced /
            records.length

          : 0

    }

  };

};

// ==================================================
// SAVE DAILY STATS
// PRICE ONLY
// CONSUMED & AVAILABLE ARE AUTO-CALCULATED
// ==================================================

exports.saveDailyStats = async ({

  day,

  price

}) => {

  const report =
    await Milk.getDailyReport(day);

  let summary =
    await MilkSummary.findOne({

      day

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day,

        month:
          day.slice(0, 7)

      });

  }

  const sales =
    summary.sales || [];

  const consumed =
    sales.reduce(

      (sum, sale) =>

        sum +
        Number(
          sale.liters || 0
        ),

      0

    );

  const cash =
    sales.reduce(

      (sum, sale) =>

        sum +
        Number(
          sale.cash || 0
        ),

      0

    );

  summary.price =
    Number(price);

  summary.consumed =
    consumed;

  summary.available =
    Math.max(

      0,

      Number(
        report.stats.total || 0
      ) - consumed

    );

  summary.cash =
    cash;

  await summary.save();

  return summary;

};

// ==================================================
// GET SALES PAGE DATA
// ==================================================

exports.getSalesPageData = async () => {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  let summary =
    await MilkSummary.findOne({

      day: today

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day: today,

        month:
          today.slice(0, 7)

      });

  }

  const standingOrders =
    await StandingOrder.find({

      omitted: false,

      isActive: true,

      effectiveDate: {

        $lte: new Date()

      }

    })
      .sort({

        customerName: 1

      })
      .lean();

  // ==================================================
  // MARK STANDING ORDERS ALREADY RECORDED TODAY
  // ==================================================

  standingOrders.forEach(order => {

    order.saleRecordedToday =
      (summary.sales || []).some(sale =>

        sale.standingOrderId &&
        sale.standingOrderId.toString() ===
        order._id.toString()

      );

    order.isFuture =
      order.effectiveDate &&
      new Date(order.effectiveDate) > new Date();

  });

  const manualSales =
    (summary.sales || []).filter(

      sale => !sale.standingOrderId

    );

  const report =
    await Milk.getDailyReport(today);

  const totalProduced =
    Number(report.stats.total || 0);

  const totalSales =
    (summary.sales || []).reduce(

      (sum, sale) =>

        sum +
        Number(sale.liters || 0),

      0

    );

  const availableMilk =
    Math.max(

      0,

      totalProduced -
      totalSales

    );

  return {

    standingOrders,

    manualSales,

    currentPrice:
      summary.price || 50,

    totalSales,

    availableMilk

  };

};
// ==================================================
// SUBMIT MANUAL SALE
// ==================================================

exports.submitManualSale = async ({

  customerName,

  liters

}) => {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  let summary =
    await MilkSummary.findOne({

      day: today

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day: today,

        month:
          today.slice(0, 7)

      });

  }

  const price =
    summary.price || 50;

  const report =
    await Milk.getDailyReport(today);

  const produced =
    Number(report.stats.total || 0);

  const sold =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.liters || 0),

      0

    );

  const available =
    produced - sold;

  if (Number(liters) > available) {

    throw new Error(

      `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`

    );

  }

  summary.sales.push({

    customerName:
      customerName.trim(),

    liters:
      Number(liters),

    price,

    cash:
      Number(liters) * price

  });

  summary.consumed =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.liters || 0),

      0

    );

  summary.cash =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.cash || 0),

      0

    );

  summary.available =
    Math.max(

      0,

      produced -
      summary.consumed

    );

  await summary.save();

  return summary;

};

// ==================================================
// SUBMIT STANDING ORDER SALE
// ==================================================

exports.submitStandingOrderSale = async ({

  standingOrderId

}) => {

  const order =
    await StandingOrder.findById(
      standingOrderId
    );

  if (!order) {

    throw new Error(
      "Standing order not found."
    );

  }

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  let summary =
    await MilkSummary.findOne({

      day: today

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day: today,

        month:
          today.slice(0, 7)

      });

  }

  const alreadyProcessed =
    summary.sales.some(

      sale =>

        sale.standingOrderId &&
        sale.standingOrderId.toString() ===
        standingOrderId

    );

  if (alreadyProcessed) {

    throw new Error(

      "Standing order has already been processed today."

    );

  }

  const price =
    summary.price || 50;

  const report =
    await Milk.getDailyReport(today);

  const produced =
    Number(report.stats.total || 0);

  const sold =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.liters || 0),

      0

    );

  const available =
    produced - sold;

  if (Number(order.liters) > available) {

    throw new Error(

      `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`

    );

  }

  summary.sales.push({

    customerName:
      order.customerName,

    liters:
      order.liters,

    price,

    cash:
      order.liters * price,

    standingOrderId:
      order._id

  });

  summary.consumed =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.liters || 0),

      0

    );

  summary.cash =
    summary.sales.reduce(

      (sum, sale) =>

        sum +
        Number(sale.cash || 0),

      0

    );

  summary.available =
    Math.max(

      0,

      produced -
      summary.consumed

    );

  await summary.save();

  return summary;

};

// ==================================================
// UPDATE MILK PRICE
// ==================================================

exports.updateMilkPrice = async (

  price

) => {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  let summary =
    await MilkSummary.findOne({

      day: today

    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day: today,

        month:
          today.slice(0, 7)

      });

  }

  summary.price =
    Number(price);

  await summary.save();

  return summary;

};

// ==================================================
// ADD STANDING ORDER
// ==================================================

exports.addStandingOrder = async ({

  customerName,

  liters

}) => {

  return StandingOrder.create({

    customerName:
      customerName.trim(),

    liters:
      Number(liters)

  });

};

// ==================================================
// OMIT STANDING ORDER
// ==================================================

exports.omitStandingOrder = async ({

  orderId,

  user

}) => {

  if (

    !user ||

    user.role !== "admin"

  ) {

    throw new Error(
      "Unauthorized"
    );

  }

  const order =
    await StandingOrder.findById(
      orderId
    );

  if (!order) {

    throw new Error(
      "Standing order not found."
    );

  }

  order.omitted = true;

  order.isActive = false;

  await order.save();

  return order;

};
// ==================================================
// MILKING HISTORY
// ==================================================

exports.getMilkingHistory = async ({

  dairyId,

  month

}) => {

  if (

    !mongoose.Types.ObjectId.isValid(
      dairyId
    )

  ) {

    throw new Error(
      "Invalid dairy animal ID."
    );

  }

  const dairy =
    await Dairy.findById(
      dairyId
    ).lean();

  if (!dairy) {

    throw new Error(
      "Dairy animal not found."
    );

  }

  const filter = {

    dairy: dairyId

  };

  if (month) {

    filter.month = month;

  }

  const records =
    await Milk.find(filter)
      .populate(
        "recordedBy",
        "name"
      )
      .sort({

        date: -1

      })
      .lean();

  const grouped = {};

  for (const record of records) {

    const day =
      record.day;

    if (!grouped[day]) {

      grouped[day] = {

        entries: [],

        total: 0

      };

    }

    grouped[day]
      .entries
      .push(record);

    grouped[day]
      .total +=
      Number(
        record.liters || 0
      );

  }

  const monthlyTotal =
    records.reduce(

      (sum, record) =>

        sum +
        Number(
          record.liters || 0
        ),

      0

    );

  return {

    dairy,

    records,

    grouped,

    monthlyTotal,

    hasData:
      records.length > 0

  };

};

// ==================================================
// LOCK DAILY SUMMARY
// ==================================================

exports.lockDay = async (

  day

) => {

  const summary =
    await MilkSummary.findOne({

      day

    });

  if (!summary) {

    throw new Error(
      "Daily summary not found."
    );

  }

  summary.locked = true;

  await summary.save();

  return summary;

};

// ==================================================
// UNLOCK DAILY SUMMARY
// ==================================================

exports.unlockDay = async (

  day

) => {

  const summary =
    await MilkSummary.findOne({

      day

    });

  if (!summary) {

    throw new Error(
      "Daily summary not found."
    );

  }

  summary.locked = false;

  await summary.save();

  return summary;

};