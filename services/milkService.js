const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");

// ==================================================
// MILK COLLECTION SETTINGS
// ==================================================

const MILK_TIMEZONE = "Africa/Nairobi";

const MORNING_END_HOUR = 10; // 10:00 AM
const EVENING_START_HOUR = 16; // 4:00 PM

const SYSTEM_USER = "system";

// ==================================================
// EAT DATE/TIME HELPERS
// ==================================================

function getEATParts(date = new Date()) {

  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: MILK_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });

  const parts =
    formatter.formatToParts(date);

  const values = {};

  for (const part of parts) {

    if (part.type !== "literal") {

      values[part.type] =
        part.value;

    }

  }

  return {

    year:
      Number(values.year),

    month:
      Number(values.month),

    day:
      Number(values.day),

    hour:
      Number(values.hour),

    minute:
      Number(values.minute),

    second:
      Number(values.second),

    dateKey:
      `${values.year}-${values.month}-${values.day}`

  };

}

// ==================================================
// CURRENT MILK SESSION
// ==================================================

function getMilkSession(date = new Date()) {

  const eat =
    getEATParts(date);

  // ================================================
  // MORNING
  // ================================================

  if (eat.hour < MORNING_END_HOUR) {

    return {

      session: "morning",

      day: eat.dateKey,

      editable: true,

      normalUserCanCreate: true,

      adminCanEdit: true,

      reason: null

    };

  }

  // ================================================
  // MORNING CORRECTION WINDOW
  // 10:00 AM - 3:59 PM
  // ================================================

  if (
    eat.hour >= MORNING_END_HOUR &&
    eat.hour < EVENING_START_HOUR
  ) {

    return {

      session: "morning",

      day: eat.dateKey,

      editable: true,

      normalUserCanCreate: false,

      adminCanEdit: true,

      reason:
        "Morning milk collection has closed. Please contact an administrator if this record needs to be changed."

    };

  }

  // ================================================
  // EVENING
  // 4:00 PM - 11:59 PM
  // ================================================

  return {

    session: "evening",

    day: eat.dateKey,

    editable: true,

    normalUserCanCreate: true,

    adminCanEdit: true,

    reason: null

  };

}

// ==================================================
// GET MILKING ANIMALS
// USED ON MILK COLLECTION PAGE
// ==================================================

exports.getMilkingAnimals = async () => {

  await exports.finalizeExpiredMilkSessions();

  const dairies =
    await Dairy.find({

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

  const now =
    new Date();

  const current =
    getMilkSession(now);

  const records =
    await Milk.find({

      day:
        current.day,

      session:
        current.session,

      dairy: {

        $in:
          dairies.map(
            dairy => dairy._id
          )

      }

    }).lean();

  const recordMap =
    new Map();

  records.forEach(record => {

    recordMap.set(
      record.dairy.toString(),
      record
    );

  });

  return dairies.map(dairy => {

    const record =
      recordMap.get(
        dairy._id.toString()
      );

    let editable = false;

    let state = "open";

    let message = "";

    if (record) {

      if (
        current.session === "morning" &&
        current.adminCanEdit
      ) {

        editable =
          current.normalUserCanCreate;

        state = "recorded";

        message =
          "Milk record already submitted.";

      }

      if (
        current.session === "evening"
      ) {

        editable =
          false;

        state = "recorded";

        message =
          "Milk record already submitted.";

      }

      // Admin correction is handled through
      // explicit admin permission in the POST.
      // The input remains visually read-only for
      // ordinary users.

    } else {

      if (
        current.normalUserCanCreate
      ) {

        editable = true;

        state = "open";

      } else {

        editable = false;

        state = "closed";

        message =
          current.reason;

      }

    }

    dairy.milkRecord =
      record || null;

    dairy.milkSession =
      current.session;

    dairy.milkEditable =
      editable;

    dairy.milkState =
      state;

    dairy.milkMessage =
      message;

    dairy.isAdminCorrectionWindow =
      current.adminCanEdit &&
      !current.normalUserCanCreate;

    return dairy;

  });

};

// ==================================================
// FINALIZE EXPIRED MILK SESSIONS
// ==================================================

exports.finalizeExpiredMilkSessions = async () => {

  const now =
    new Date();

  const eat =
    getEATParts(now);

  const day =
    eat.dateKey;

  // ==================================================
  // MORNING HAS EXPIRED AT 10:00
  // ==================================================

  if (eat.hour >= MORNING_END_HOUR) {

    await createMissingSessionRecords({

      day,

      session: "morning"

    });

  }

  // ==================================================
  // EVENING HAS EXPIRED AT MIDNIGHT
  //
  // At 00:00, the EAT date has already changed.
  // Therefore finalize the previous day's evening.
  // ==================================================

  if (eat.hour === 0) {

    const previousDay =
      getPreviousEATDay(day);

    await createMissingSessionRecords({

      day:
        previousDay,

      session: "evening"

    });

  }

};

// ==================================================
// PREVIOUS EAT DAY
// ==================================================

function getPreviousEATDay(day) {

  const [year, month, date] =
    day
      .split("-")
      .map(Number);

  const d =
    new Date(
      Date.UTC(
        year,
        month - 1,
        date - 1
      )
    );

  return d
    .toISOString()
    .split("T")[0];

}

// ==================================================
// CREATE MISSING SESSION RECORDS
// ==================================================

async function createMissingSessionRecords({

  day,

  session

}) {

  const dairies =
    await Dairy.find({

      isMilking: true,

      code: {

        $gte: 0,

        $mod: [2, 0]

      }

    })
      .select("_id")
      .lean();

  if (!dairies.length) {

    return;

  }

  for (const dairy of dairies) {

    const existing =
      await Milk.findOne({

        dairy:
          dairy._id,

        day,

        session

      });

    if (existing) {

      continue;

    }

    try {

      await Milk.create({

        dairy:
          dairy._id,

        liters:
          0,

        remarks:
          "Not Milked",

        recordedBy:
          SYSTEM_USER,

        date:
          new Date(),

        day,

        month:
          day.slice(0, 7),

        session

      });

    } catch (err) {

      // Duplicate-key errors can happen when
      // another process finalizes at the same time.
      // The unique index in the schema will protect
      // against duplicate session records.

      if (err.code !== 11000) {

        console.error(
          "Automatic milk finalization error:",
          err
        );

      }

    }

  }

}

// ==================================================
// SAVE / UPDATE MILK RECORDS
// ==================================================

exports.saveMilkRecords = async (

  records,

  userId,

  user

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

  // Finalize anything that should already
  // have been automatically closed.

  await exports.finalizeExpiredMilkSessions();

  const now =
    new Date();

  const current =
    getMilkSession(now);

  const isAdmin =
    user?.role === "admin";

  const results = [];

  // ==================================================
  // PROCESS EACH ANIMAL
  // ==================================================

  for (const record of records) {

    if (!record.dairy) {

      continue;

    }

    if (
      !mongoose.Types.ObjectId.isValid(
        record.dairy
      )
    ) {

      throw new Error(
        "Invalid dairy animal ID."
      );

    }

    const dairy =
      await Dairy.findById(
        record.dairy
      )
        .select(
          "_id name code isMilking"
        )
        .lean();

    if (!dairy) {

      throw new Error(
        "Dairy animal not found."
      );

    }

    if (!dairy.isMilking) {

      throw new Error(
        `${dairy.name} is no longer marked as being milked.`
      );

    }

    // ==================================================
    // DETERMINE SESSION
    // ==================================================

    const session =
      current.session;

    // ==================================================
    // FIND EXISTING RECORD
    // ==================================================

    const existing =
      await Milk.findOne({

        dairy:
          dairy._id,

        day:
          current.day,

        session

      });

    // ==================================================
    // EXISTING RECORD
    // ==================================================

    if (existing) {

      // ----------------------------------------------
      // ADMIN CAN EDIT DURING THE CORRECTION WINDOW
      // ----------------------------------------------

      if (isAdmin) {

        const canAdminEdit =
          (
            session === "morning" &&
            current.adminCanEdit
          ) ||
          (
            session === "evening" &&
            current.adminCanEdit
          );

        if (!canAdminEdit) {

          throw new Error(
            `The ${session} milk record for ${dairy.name} is closed.`
          );

        }

        const liters =
          Number(record.liters);

        if (
          !Number.isFinite(liters) ||
          liters < 0
        ) {

          throw new Error(
            `Invalid milk quantity for ${dairy.name}.`
          );

        }

        existing.liters =
          liters;

        existing.remarks =
          liters === 0
            ? (
                record.remarks?.trim() ||
                "Not Milked"
              )
            : (
                record.remarks?.trim() ||
                ""
              );

        existing.recordedBy =
          userId;

        existing.date =
          now;

        await existing.save();

        results.push(existing);

        continue;

      }

      // ----------------------------------------------
      // NORMAL USER CANNOT EDIT
      // ----------------------------------------------

      throw new Error(
        `You have already submitted the ${session} milk record for ${dairy.name}. Please contact an administrator if it needs to be changed.`
      );

    }

    // ==================================================
    // NO EXISTING RECORD
    // ==================================================

    if (!current.normalUserCanCreate && !isAdmin) {

      throw new Error(
        `${session === "morning" ? "Morning" : "Evening"} milk collection is closed for ${dairy.name}. Please contact an administrator.`
      );

    }

    // ==================================================
    // ADMIN DURING MORNING CORRECTION WINDOW
    //
    // If automatic finalization has already created
    // a zero record, the branch above would update it.
    //
    // This branch is mainly protection against a race
    // where an admin tries to create a missing record.
    // ==================================================

    if (
      isAdmin &&
      !current.normalUserCanCreate &&
      session === "morning"
    ) {

      throw new Error(
        `The morning record for ${dairy.name} has not yet been finalized. Please reload the page and try again.`
      );

    }

    // ==================================================
    // CREATE NEW USER/ADMIN RECORD
    // ==================================================

    const liters =
      Number(record.liters);

    if (
      !Number.isFinite(liters) ||
      liters < 0
    ) {

      throw new Error(
        `Invalid milk quantity for ${dairy.name}.`
      );

    }

    const newRecord =
      await Milk.create({

        dairy:
          dairy._id,

        liters,

        remarks:
          liters === 0
            ? (
                record.remarks?.trim() ||
                "Not Milked"
              )
            : (
                record.remarks?.trim() ||
                ""
              ),

        recordedBy:
          userId,

        date:
          now,

        day:
          current.day,

        month:
          current.day.slice(0, 7),

        session

      });

    results.push(newRecord);

  }

  return results;

};

// ==================================================
// START AUTOMATIC MILK FINALIZATION
// ==================================================

let milkFinalizationTimer = null;

exports.startMilkFinalizationScheduler = () => {

  if (milkFinalizationTimer) {

    return;

  }

  // Run immediately.

  exports.finalizeExpiredMilkSessions()
    .catch(err => {

      console.error(
        "Initial milk finalization error:",
        err
      );

    });

  // Check every minute.

  milkFinalizationTimer =
    setInterval(() => {

      exports.finalizeExpiredMilkSessions()
        .catch(err => {

          console.error(
            "Scheduled milk finalization error:",
            err
          );

        });

    }, 60 * 1000);

  // Do not keep Node alive solely because
  // of this timer.

  if (
    milkFinalizationTimer.unref
  ) {

    milkFinalizationTimer.unref();

  }

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

        month:
          day.slice(0, 7),

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

  const eat =
    getEATParts();

  const today =
    eat.dateKey;

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

  standingOrders.forEach(order => {

    order.saleRecordedToday =
      (summary.sales || []).some(
        sale =>
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
    Number(
      report.stats.total || 0
    );

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

  const eat =
    getEATParts();

  const today =
    eat.dateKey;

  let summary =
    await MilkSummary.findOne({
      day: today
    });

  if (!summary) {

    summary =
      await MilkSummary.create({
        day: today,
        month: today.slice(0, 7)
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

  const eat =
    getEATParts();

  const today =
    eat.dateKey;

  let summary =
    await MilkSummary.findOne({
      day: today
    });

  if (!summary) {

    summary =
      await MilkSummary.create({
        day: today,
        month: today.slice(0, 7)
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

  const eat =
    getEATParts();

  const today =
    eat.dateKey;

  let summary =
    await MilkSummary.findOne({
      day: today
    });

  if (!summary) {

    summary =
      await MilkSummary.create({
        day: today,
        month: today.slice(0, 7)
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

    filter.month =
      month;

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

// ==================================================
// START SCHEDULER
// ==================================================

exports.startMilkFinalizationScheduler();