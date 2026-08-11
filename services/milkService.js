const mongoose = require("mongoose");

const Milk =
  require("../models/milk");

const Dairy =
  require("../models/dairy");

const MilkSummary =
  require("../models/milkSummary");

const StandingOrder =
  require("../models/standingOrder");


// ==================================================
// TIMEZONE
// ==================================================

const TIME_ZONE =
  "Africa/Nairobi";


// ==================================================
// GET CURRENT KENYA DATE/TIME
// ==================================================

function getKenyaDateParts() {

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23"
      }
    )
      .formatToParts(
        new Date()
      );

  const get =
    name =>
      Number(
        parts.find(
          p =>
            p.type === name
        )?.value || 0
      );

  const year =
    get("year");

  const month =
    get("month");

  const day =
    get("day");

  const hour =
    get("hour");

  const minute =
    get("minute");

  const second =
    get("second");

  return {

    year,

    month,

    day,

    hour,

    minute,

    second,

    date:
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

    monthKey:
      `${year}-${String(month).padStart(2, "0")}`,

    timeMinutes:
      hour * 60 + minute

  };

}


// ==================================================
// MILK SESSION
// ==================================================

function getMilkSession() {

  const now =
    getKenyaDateParts();

  /*
   * MORNING:
   * 00:00 - 09:59
   *
   * EVENING:
   * 16:00 - 23:59
   *
   * CLOSED:
   * 10:00 - 15:59
   */

  if (
    now.timeMinutes < 600
  ) {

    return {

      name:
        "morning",

      label:
        "Morning",

      day:
        now.date,

      month:
        now.monthKey,

      open:
        true,

      canSubmit:
        true

    };

  }

  if (
    now.timeMinutes >= 960
  ) {

    return {

      name:
        "evening",

      label:
        "Evening",

      day:
        now.date,

      month:
        now.monthKey,

      open:
        true,

      canSubmit:
        true

    };

  }

  return {

    name:
      null,

    label:
      "Closed",

    day:
      now.date,

    month:
      now.monthKey,

    open:
      false,

    canSubmit:
      false

  };

}


// ==================================================
// SESSION EDIT DEADLINE
// ==================================================

function getSessionDeadline(
  sessionName
) {

  const now =
    getKenyaDateParts();

  if (
    sessionName ===
    "morning"
  ) {

    return {

      year:
        now.year,

      month:
        now.month,

      day:
        now.day,

      hour:
        16,

      minute:
        0

    };

  }

  if (
    sessionName ===
    "evening"
  ) {

    return {

      year:
        now.year,

      month:
        now.month,

      day:
        now.day,

      hour:
        24,

      minute:
        0

    };

  }

  return null;

}


// ==================================================
// CHECK WHETHER SESSION CAN BE EDITED
// ==================================================

function canEditSession(
  sessionName
) {

  const now =
    getKenyaDateParts();

  if (
    sessionName ===
    "morning"
  ) {

    return (
      now.timeMinutes <
      960
    );

  }

  if (
    sessionName ===
    "evening"
  ) {

    return (
      now.timeMinutes >= 960
    );

  }

  return false;

}


// ==================================================
// CREATE BUSINESS-RULE ERROR
// ==================================================

function milkError(
  code,
  message
) {

  const error =
    new Error(message);

  error.code =
    code;

  return error;

}


// ==================================================
// GET MILKING ANIMALS
// USED ON MILK COLLECTION PAGE
// ==================================================

exports.getMilkingAnimals = async () => {

  return Dairy.find({

    isMilking:
      true,

    code: {

      $gte:
        0,

      $mod:
        [2, 0]

    }

  })
    .sort({

      code:
        1

    })
    .lean();

};


// ==================================================
// FINALIZE EXPIRED MILK SESSION
// ==================================================

exports.finalizeExpiredMilkSession = async (
  sessionName,
  day
) => {

  if (
    !sessionName ||
    !day
  ) {

    return [];

  }

  const dairies =
    await exports.getMilkingAnimals();

  if (
    !dairies.length
  ) {

    return [];

  }

  /*
   * Once a session closes, every milking animal
   * without a record for that session receives:
   *
   * liters: 0
   * remarks: Not Milked
   * recordedBy: system
   *
   * The schema will need to support the session
   * and system-recorded fields.
   */

  const existing =
    await Milk.find({

      day,

      session:
        sessionName

    })
      .select(
        "dairy"
      )
      .lean();

  const recorded =
    new Set(
      existing.map(
        record =>
          record.dairy.toString()
      )
    );

  const docs = [];

  for (
    const dairy
    of dairies
  ) {

    const dairyId =
      dairy._id.toString();

    if (
      recorded.has(
        dairyId
      )
    ) {

      continue;

    }

    docs.push({

      dairy:
        dairy._id,

      liters:
        0,

      remarks:
        "Not Milked",

      recordedBy:
        null,

      recordedBySystem:
        true,

      session:
        sessionName,

      date:
        new Date(),

      day,

      month:
        day.slice(0, 7)

    });

  }

  if (
    !docs.length
  ) {

    return [];

  }

  return Milk.insertMany(
    docs
  );

};


// ==================================================
// FINALIZE EXPIRED SESSIONS FOR TODAY
// ==================================================

exports.finalizeExpiredMilkSessions =
  async () => {

    const now =
      getKenyaDateParts();

    const results = [];

    /*
     * At 10:00 AM, finalize missing morning records.
     */

    if (
      now.timeMinutes >= 600
    ) {

      results.push(
        await exports.finalizeExpiredMilkSession(
          "morning",
          now.date
        )
      );

    }

    /*
     * At midnight, the evening session expires.
     *
     * This function is also called on page access.
     * A scheduled job can call the same function
     * to make it fully automatic even when nobody
     * opens the milk page.
     */

    return results.flat();

  };


// ==================================================
// GET MILK PAGE DATA
// ==================================================

exports.getMilkPageData = async () => {

  /*
   * Finalize any session whose deadline has passed.
   */

  await exports.finalizeExpiredMilkSessions();

  const dairies =
    await exports.getMilkingAnimals();

  const now =
    getKenyaDateParts();

  let session;

  if (
    now.timeMinutes < 600
  ) {

    session =
      "morning";

  } else if (
    now.timeMinutes >= 960
  ) {

    session =
      "evening";

  } else {

    session =
      null;

  }

  let milkRecords =
    [];

  if (
    session
  ) {

    milkRecords =
      await Milk.find({

        day:
          now.date,

        session

      })
        .lean();

  }

  const recordMap =
    new Map();

  milkRecords.forEach(
    record => {

      recordMap.set(
        record.dairy.toString(),
        record
      );

    }
  );

  const dairiesWithRecords =
    dairies.map(
      dairy => {

        const record =
          recordMap.get(
            dairy._id.toString()
          );

        return {

          ...dairy,

          milkRecord:
            record || null,

          recorded:
            !!record

        };

      }
    );

  return {

    dairies:
      dairiesWithRecords,

    milkRecords,

    session:
      session
        ? {
            name:
              session,

            label:
              session ===
              "morning"
                ? "Morning"
                : "Evening"
          }
        : {
            name:
              null,

            label:
              "Closed"
          },

    canSubmit:
      !!session

  };

};


// ==================================================
// SAVE MILK RECORDS
// ==================================================

exports.saveMilkRecords = async (
  records,
  user
) => {

  if (
    !Array.isArray(records) ||
    !records.length
  ) {

    return [];

  }

  if (
    !user ||
    !user._id
  ) {

    throw new Error(
      "User ID is required to record milk."
    );

  }

  const now =
    getKenyaDateParts();

  let session;

  /*
   * Before 10:00 AM = morning.
   */

  if (
    now.timeMinutes < 600
  ) {

    session =
      "morning";

  /*
   * From 4:00 PM = evening.
   */

  } else if (
    now.timeMinutes >= 960
  ) {

    session =
      "evening";

  /*
   * 10:00 AM - 3:59 PM = closed.
   */

  } else {

    throw milkError(

      "MILK_TIME_CLOSED",

      "The morning milk submission period has ended and the evening period has not started. Please contact an administrator."

    );

  }


  /*
   * Only one submission per animal per session.
   *
   * Even an administrator cannot create a second
   * record through the normal submit operation.
   * Administrators use editMilkRecord instead.
   */

  const dairyIds =
    records
      .map(
        record =>
          record.dairy
      )
      .filter(Boolean);

  const existing =
    await Milk.find({

      dairy:
        {
          $in:
            dairyIds
        },

      day:
        now.date,

      session

    })
      .select(
        "dairy"
      )
      .lean();

  const existingIds =
    new Set(
      existing.map(
        record =>
          record.dairy.toString()
      )
    );


  const docs = [];

  for (
    const record
    of records
  ) {

    if (
      !record.dairy
    ) {

      continue;

    }

    if (
      existingIds.has(
        record.dairy.toString()
      )
    ) {

      throw milkError(

        "MILK_ALREADY_RECORDED",

        "A milk record has already been submitted for one or more animals in this session. If a correction is required, please contact an administrator."

      );

    }

    const liters =
      Number(
        record.liters
      );

    if (
      Number.isNaN(liters) ||
      liters < 0
    ) {

      throw new Error(
        "Invalid milk quantity."
      );

    }

    docs.push({

      dairy:
        record.dairy,

      liters,

      remarks:
        record.remarks ||
        "",

      recordedBy:
        user._id,

      recordedBySystem:
        false,

      session,

      date:
        new Date(),

      day:
        now.date,

      month:
        now.monthKey

    });

  }

  if (
    !docs.length
  ) {

    return [];

  }

  return Milk.insertMany(
    docs
  );

};


// ==================================================
// EDIT EXISTING MILK RECORD
// ADMIN ONLY
// ==================================================

exports.editMilkRecord = async ({
  recordId,
  liters,
  remarks,
  user
}) => {

  if (
    !user ||
    user.role !== "admin"
  ) {

    throw milkError(

      "MILK_ADMIN_REQUIRED",

      "This milk record has already been submitted. Please contact an administrator if it needs to be changed."

    );

  }

  if (
    !mongoose.Types.ObjectId.isValid(
      recordId
    )
  ) {

    throw milkError(

      "MILK_NOT_FOUND",

      "Invalid milk record."

    );

  }

  const record =
    await Milk.findById(
      recordId
    );

  if (!record) {

    throw milkError(

      "MILK_NOT_FOUND",

      "Milk record not found."

    );

  }

  const now =
    getKenyaDateParts();

  /*
   * Never allow editing a previous day.
   */

  if (
    record.day !==
    now.date
  ) {

    throw milkError(

      "MILK_TIME_CLOSED",

      "This milk record belongs to a previous day and can no longer be edited."

    );

  }

  /*
   * Morning:
   * editable only before 4:00 PM.
   */

  if (
    record.session ===
    "morning"
  ) {

    if (
      now.timeMinutes >=
      960
    ) {

      throw milkError(

        "MILK_TIME_CLOSED",

        "The morning milk editing period has ended. Morning records cannot be changed after 4:00 PM."

      );

    }

  }

  /*
   * Evening:
   * editable until midnight.
   */

  else if (
    record.session ===
    "evening"
  ) {

    if (
      now.timeMinutes <
      960
    ) {

      throw milkError(

        "MILK_TIME_CLOSED",

        "The evening milk record cannot be edited before 4:00 PM."

      );

    }

  }

  else {

    throw milkError(

      "MILK_TIME_CLOSED",

      "This milk record cannot be edited."

    );

  }

  const quantity =
    Number(
      liters
    );

  if (
    Number.isNaN(quantity) ||
    quantity < 0
  ) {

    throw new Error(
      "Invalid milk quantity."
    );

  }

  record.liters =
    quantity;

  record.remarks =
    remarks || "";

  /*
   * Keep the original recordedBy.
   * Editing does not replace the person who
   * originally submitted the record.
   */

  await record.save();

  return record;

};


// ==================================================
// GET CURRENT PRICE
// ==================================================

exports.getCurrentPrice = async () => {

  const latest =
    await MilkSummary
      .findOne({

        price: {
          $gt:
            0
        }

      })
      .sort({

        day:
          -1

      })
      .lean();

  return latest?.price ||
    50;

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

exports.getDailyStats = async (
  day
) => {

  const report =
    await Milk.getDailyReport(
      day
    );

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

        price:
          50,

        consumed:
          0,

        available:
          report.stats.total ||
          0,

        cash:
          0,

        locked:
          false,

        sales:
          []

      });

  }

  const sales =
    summary.sales ||
    [];

  const consumed =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.liters ||
          0
        ),
      0
    );

  const available =
    Math.max(

      0,

      Number(
        report.stats.total ||
        0
      ) -
      consumed

    );

  const cash =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.cash ||
          0
        ),
      0
    );

  if (
    summary.consumed !==
      consumed ||

    summary.available !==
      available ||

    summary.cash !==
      cash
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
      report.records ||
      [],

    sales,

    stats: {

      total:
        report.stats.total ||
        0,

      consumed,

      available,

      price:
        summary.price ||
        50,

      cash,

      locked:
        summary.locked ||
        false

    }

  };

};


// ==================================================
// GET MONTHLY STATS
// ==================================================

exports.getMonthlyStats = async (
  month
) => {

  const report =
    await Milk.getMonthlyReport(
      month
    );

  const dairies =
    await Dairy.find()
      .lean();

  const dairyMap =
    {};

  dairies.forEach(
    dairy => {

      dairyMap[
        dairy._id.toString()
      ] =
        dairy;

    }
  );

  const records =
    (report.records || [])
      .map(
        record => ({

          dairy:
            dairyMap[
              record.dairy.toString()
            ] ||
            null,

          total:
            record.total,

          avg:
            record.avg

        })
      );

  const summaries =
    await MilkSummary.find({
      month
    })
      .lean();

  let totalConsumed =
    0;

  let totalCash =
    0;

  let totalPrice =
    0;

  const sales =
    [];

  summaries.forEach(
    summary => {

      totalPrice +=
        Number(
          summary.price ||
          0
        );

      (
        summary.sales ||
        []
      ).forEach(
        sale => {

          totalConsumed +=
            Number(
              sale.liters ||
              0
            );

          totalCash +=
            Number(
              sale.cash ||
              0
            );

          sales.push(
            sale
          );

        }
      );

    }
  );

  const totalProduced =
    records.reduce(
      (sum, record) =>
        sum +
        Number(
          record.total ||
          0
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

      locked:
        false,

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
    await Milk.getDailyReport(
      day
    );

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
    summary.sales ||
    [];

  const consumed =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.liters ||
          0
        ),
      0
    );

  const cash =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.cash ||
          0
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
        report.stats.total ||
        0
      ) -
      consumed

    );

  summary.cash =
    cash;

  await summary.save();

  return summary;

};


// ==================================================
// GET SALES PAGE DATA
// ==================================================

exports.getSalesPageData =
  async () => {

    const today =
      getKenyaDateParts()
        .date;

    let summary =
      await MilkSummary.findOne({
        day:
          today
      });

    if (!summary) {

      summary =
        await MilkSummary.create({

          day:
            today,

          month:
            today.slice(0, 7)

        });

    }

    const standingOrders =
      await StandingOrder.find({

        omitted:
          false,

        isActive:
          true,

        effectiveDate: {

          $lte:
            new Date()

        }

      })
        .sort({

          customerName:
            1

        })
        .lean();

    standingOrders.forEach(
      order => {

        order.saleRecordedToday =
          (
            summary.sales ||
            []
          ).some(
            sale =>

              sale.standingOrderId &&

              sale.standingOrderId
                .toString() ===
              order._id.toString()

          );

        order.isFuture =
          order.effectiveDate &&
          new Date(
            order.effectiveDate
          ) >
          new Date();

      }
    );

    const manualSales =
      (
        summary.sales ||
        []
      ).filter(
        sale =>
          !sale.standingOrderId
      );

    const report =
      await Milk.getDailyReport(
        today
      );

    const totalProduced =
      Number(
        report.stats.total ||
        0
      );

    const totalSales =
      (
        summary.sales ||
        []
      ).reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.liters ||
            0
          ),
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
        summary.price ||
        50,

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
    getKenyaDateParts()
      .date;

  let summary =
    await MilkSummary.findOne({
      day:
        today
    });

  if (!summary) {

    summary =
      await MilkSummary.create({

        day:
          today,

        month:
          today.slice(0, 7)

      });

  }

  const price =
    summary.price ||
    50;

  const report =
    await Milk.getDailyReport(
      today
    );

  const produced =
    Number(
      report.stats.total ||
      0
    );

  const sold =
    summary.sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.liters ||
          0
        ),
      0
    );

  const available =
    produced -
    sold;

  if (
    Number(liters) >
    available
  ) {

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
      Number(liters) *
      price

  });

  summary.consumed =
    summary.sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.liters ||
          0
        ),
      0
    );

  summary.cash =
    summary.sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.cash ||
          0
        ),
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

exports.submitStandingOrderSale =
  async ({
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
      getKenyaDateParts()
        .date;

    let summary =
      await MilkSummary.findOne({
        day:
          today
      });

    if (!summary) {

      summary =
        await MilkSummary.create({

          day:
            today,

          month:
            today.slice(0, 7)

        });

    }

    const alreadyProcessed =
      summary.sales.some(
        sale =>

          sale.standingOrderId &&

          sale.standingOrderId
            .toString() ===
          standingOrderId

      );

    if (
      alreadyProcessed
    ) {

      throw new Error(
        "Standing order has already been processed today."
      );

    }

    const price =
      summary.price ||
      50;

    const report =
      await Milk.getDailyReport(
        today
      );

    const produced =
      Number(
        report.stats.total ||
        0
      );

    const sold =
      summary.sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.liters ||
            0
          ),
        0
      );

    const available =
      produced -
      sold;

    if (
      Number(order.liters) >
      available
    ) {

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
        order.liters *
        price,

      standingOrderId:
        order._id

    });

    summary.consumed =
      summary.sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.liters ||
            0
          ),
        0
      );

    summary.cash =
      summary.sales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.cash ||
            0
          ),
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

exports.updateMilkPrice =
  async (price) => {

    const today =
      getKenyaDateParts()
        .date;

    let summary =
      await MilkSummary.findOne({
        day:
          today
      });

    if (!summary) {

      summary =
        await MilkSummary.create({

          day:
            today,

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

exports.addStandingOrder =
  async ({
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

exports.omitStandingOrder =
  async ({
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

    order.omitted =
      true;

    order.isActive =
      false;

    await order.save();

    return order;

  };


// ==================================================
// MILKING HISTORY
// ==================================================

exports.getMilkingHistory =
  async ({
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

      dairy:
        dairyId

    };

    if (month) {

      filter.month =
        month;

    }

    const records =
      await Milk.find(
        filter
      )
        .populate(
          "recordedBy",
          "name"
        )
        .sort({

          date:
            -1

        })
        .lean();

    const grouped =
      {};

    for (
      const record
      of records
    ) {

      const day =
        record.day;

      if (
        !grouped[day]
      ) {

        grouped[day] = {

          entries:
            [],

          total:
            0

        };

      }

      grouped[day]
        .entries
        .push(record);

      grouped[day]
        .total +=
        Number(
          record.liters ||
          0
        );

    }

    const monthlyTotal =
      records.reduce(
        (sum, record) =>
          sum +
          Number(
            record.liters ||
            0
          ),
        0
      );

    return {

      dairy,

      records,

      grouped,

      monthlyTotal,

      hasData:
        records.length >
        0

    };

  };


// ==================================================
// LOCK DAILY SUMMARY
// ==================================================

exports.lockDay =
  async (day) => {

    const summary =
      await MilkSummary.findOne({
        day
      });

    if (!summary) {

      throw new Error(
        "Daily summary not found."
      );

    }

    summary.locked =
      true;

    await summary.save();

    return summary;

  };


// ==================================================
// UNLOCK DAILY SUMMARY
// ==================================================

exports.unlockDay =
  async (day) => {

    const summary =
      await MilkSummary.findOne({
        day
      });

    if (!summary) {

      throw new Error(
        "Daily summary not found."
      );

    }

    summary.locked =
      false;

    await summary.save();

    return summary;

  };