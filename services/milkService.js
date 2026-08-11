const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");

// ==================================================
// EAT HELPERS
// ==================================================

function getEATNow() {

  const now = new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }
    )
      .formatToParts(now);

  const result = {};

  parts.forEach(part => {

    if (part.type !== "literal") {

      result[part.type] =
        part.value;

    }

  });

  return {

    year: Number(result.year),

    month: Number(result.month),

    day: Number(result.day),

    hour: Number(result.hour),

    minute: Number(result.minute),

    second: Number(result.second)

  };

}

// ==================================================

function getEATDay() {

  const now =
    getEATNow();

  return `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;

}

// ==================================================

function getEATMonth() {

  return getEATDay().slice(0, 7);

}

// ==================================================
// DETERMINE CURRENT SESSION
// ==================================================

function getCurrentSession() {

  const now =
    getEATNow();

  const hour =
    now.hour;

  // Morning window:
  // 00:00 - 09:59

  if (hour < 10) {

    return "morning";

  }

  // Restricted period:
  // 10:00 - 15:59

  if (hour < 16) {

    return null;

  }

  // Evening:
  // 16:00 - 23:59

  return "evening";

}

// ==================================================
// SESSION STATUS
// ==================================================

function getSessionStatus(session) {

  const now =
    getEATNow();

  const hour =
    now.hour;

  if (session === "morning") {

    if (hour < 10) {

      return "open";

    }

    if (hour < 16) {

      return "admin_edit";

    }

    return "closed";

  }

  if (session === "evening") {

    if (hour < 16) {

      return "not_open";

    }

    return "open";

  }

  return "closed";

}

// ==================================================
// GET MILKING ANIMALS
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
// AUTO FINALIZE EXPIRED SESSION
// ==================================================

async function finalizeSession(
  session,
  day
) {

  const animals =
    await Dairy.find({

      isMilking: true,

      code: {
        $gte: 0,
        $mod: [2, 0]
      }

    })
      .select("_id")
      .lean();

  if (!animals.length) {

    return [];

  }

  const existing =
    await Milk.find({

      day,

      session,

      dairy: {
        $in:
          animals.map(
            animal => animal._id
          )
      }

    })
      .select("dairy")
      .lean();

  const existingIds =
    new Set(

      existing.map(
        record =>
          record.dairy.toString()
      )

    );

  const missing =
    animals.filter(

      animal =>
        !existingIds.has(
          animal._id.toString()
        )

    );

  if (!missing.length) {

    return [];

  }

  const docs =
    missing.map(animal => ({

      dairy:
        animal._id,

      liters: 0,

      remarks: "Not Milked",

      recordedBy: null,

      recordedByType: "system",

      date: new Date(),

      day,

      month:
        day.slice(0, 7),

      session

    }));

  try {

    return await Milk.insertMany(
      docs,
      {
        ordered: false
      }
    );

  } catch (err) {

    // Duplicate records can happen if two requests
    // finalize the same session simultaneously.
    if (
      err.code === 11000 ||
      err.writeErrors
    ) {

      return [];

    }

    throw err;

  }

}

// ==================================================
// FINALIZE EXPIRED SESSIONS
// ==================================================

exports.finalizeExpiredMilkSessions =
  async () => {

    const day =
      getEATDay();

    const session =
      getCurrentSession();

    // Morning becomes automatic at 10:00.
    if (
      session === null ||
      session === "evening"
    ) {

      await finalizeSession(
        "morning",
        day
      );

    }

    // Evening becomes automatic at midnight.
    //
    // This requires a scheduler to execute after
    // midnight for a true automatic finalization.
    //
    // The function is also safe to call when the
    // milk page/report is opened.

    return true;

  };

// ==================================================
// SAVE MILK RECORDS
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

    throw new Error(
      "No milk records were submitted."
    );

  }

  if (!userId) {

    throw new Error(
      "User ID is required to record milk."
    );

  }

  const isAdmin =
    user?.role === "admin";

  const session =
    getCurrentSession();

  const day =
    getEATDay();

  // --------------------------------------------------
  // NO ACTIVE WINDOW
  // --------------------------------------------------

  if (!session) {

    throw new Error(
      "Milk collection is currently closed. The morning session ended at 10:00 AM and the evening session starts at 4:00 PM. Please contact an administrator."
    );

  }

  // --------------------------------------------------
  // FINALIZE PREVIOUS SESSION
  // --------------------------------------------------

  if (session === "evening") {

    await finalizeSession(
      "morning",
      day
    );

  }

  // --------------------------------------------------
  // FETCH EXISTING RECORDS
  // --------------------------------------------------

  const dairyIds =
    records
      .map(record => record.dairy)
      .filter(Boolean);

  const existing =
    await Milk.find({

      dairy: {
        $in: dairyIds
      },

      day,

      session

    })
      .lean();

  const existingMap =
    new Map();

  existing.forEach(record => {

    existingMap.set(
      record.dairy.toString(),
      record
    );

  });

  const docs = [];

  for (
    const record of records
  ) {

    if (!record.dairy) {

      continue;

    }

    const existingRecord =
      existingMap.get(
        record.dairy.toString()
      );

    // ------------------------------------------------
    // RECORD ALREADY EXISTS
    // ------------------------------------------------

    if (existingRecord) {

      if (!isAdmin) {

        throw new Error(
          "One or more milk records have already been submitted. Please contact an administrator if a correction is required."
        );

      }

      // Admin editing rules.
      if (
        session === "morning"
      ) {

        // Normal morning period.
        // Admin may edit.

      } else if (
        session === "evening"
      ) {

        // Evening record can be edited
        // before midnight.

      }

      continue;

    }

    const liters =
      Number(record.liters);

    if (
      !Number.isFinite(liters) ||
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
        record.remarks || "",

      recordedBy:
        userId,

      recordedByType:
        "user",

      date:
        new Date(),

      day,

      month:
        day.slice(0, 7),

      session

    });

  }

  if (!docs.length) {

    throw new Error(
      "No new milk records were available to save."
    );

  }

  try {

    return await Milk.insertMany(
      docs,
      {
        ordered: false
      }
    );

  } catch (err) {

    if (
      err.code === 11000 ||
      err.writeErrors
    ) {

      throw new Error(
        "One or more animals already have a milk record for this session. Please contact an administrator if a correction is required."
      );

    }

    throw err;

  }

};

// ==================================================
// ADMIN EDIT MILK RECORD
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

    throw new Error(
      "Only an administrator can edit a submitted milk record."
    );

  }

  if (
    !mongoose.Types.ObjectId.isValid(
      recordId
    )
  ) {

    throw new Error(
      "Invalid milk record."
    );

  }

  const record =
    await Milk.findById(
      recordId
    );

  if (!record) {

    throw new Error(
      "Milk record not found."
    );

  }

  const status =
    getSessionStatus(
      record.session
    );

  // Morning:
  // editable before 4 PM.

  if (
    record.session === "morning" &&
    status === "closed"
  ) {

    throw new Error(
      "The morning milk record can no longer be edited because the 4:00 PM editing deadline has passed."
    );

  }

  // Evening:
  // editable until midnight.

  if (
    record.session === "evening" &&
    status !== "open"
  ) {

    throw new Error(
      "The evening milk record can no longer be edited because the day has ended."
    );

  }

  const quantity =
    Number(liters);

  if (
    !Number.isFinite(quantity) ||
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

  record.recordedBy =
    user._id;

  record.recordedByType =
    "user";

  await record.save();

  return record;

};

// ==================================================
// GET MILK PAGE DATA
// ==================================================

exports.getMilkPageData =
  async (user) => {

    const day =
      getEATDay();

    const session =
      getCurrentSession();

    // Automatically finalize morning
    // once 10 AM has passed.

    if (
      session === null ||
      session === "evening"
    ) {

      await finalizeSession(
        "morning",
        day
      );

    }

    const dairies =
      await exports.getMilkingAnimals();

    const records =
      await Milk.find({

        day

      })
        .lean();

    const recordMap =
      new Map();

    records.forEach(record => {

      recordMap.set(
        `${record.dairy.toString()}-${record.session}`,
        record
      );

    });

    const isAdmin =
      user?.role === "admin";

    const data =
      dairies.map(dairy => {

        const morning =
          recordMap.get(
            `${dairy._id.toString()}-morning`
          );

        const evening =
          recordMap.get(
            `${dairy._id.toString()}-evening`
          );

        return {

          ...dairy,

          morning,

          evening

        };

      });

    return {

      dairies: data,

      day,

      session,

      isAdmin,

      eatHour:
        getEATNow().hour

    };

};

// ==================================================
// EXISTING FUNCTIONS BELOW
// ==================================================
// Keep your existing:
// getCurrentPrice
// toggleMilkingStatus
// getDailyStats
// getMonthlyStats
// saveDailyStats
// getSalesPageData
// submitManualSale
// submitStandingOrderSale
// updateMilkPrice
// addStandingOrder
// omitStandingOrder
// getMilkingHistory
// lockDay
// unlockDay
//
// They can remain as they are, except that any date calculation
// for milk records should use EAT rather than toISOString()
// directly.