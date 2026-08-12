const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");

// ==================================================
// TIMEZONE
// ==================================================

const TIME_ZONE = "Africa/Nairobi";

// ==================================================
// GET CURRENT KENYA DATE/TIME
// ==================================================

function getKenyaDateParts() {

const parts = new Intl.DateTimeFormat(
"en-GB",
{
timeZone: TIME_ZONE,
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
hourCycle: "h23"
}
).formatToParts(new Date());

const get = (name) =>
Number(
parts.find(
part => part.type === name
)?.value || 0
);

const year = get("year");
const month = get("month");
const day = get("day");
const hour = get("hour");
const minute = get("minute");
const second = get("second");

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
//
// 00:00 - 09:59 = MORNING
// 10:00 - 15:59 = CLOSED
// 16:00 - 23:59 = EVENING
// ==================================================

function getMilkSession() {

const now = getKenyaDateParts();

if (now.timeMinutes < 600) {

return {  

  name: "morning",  
  label: "Morning",  
  day: now.date,  
  month: now.monthKey,  
  open: true,  
  canSubmit: true  

};

}

if (now.timeMinutes >= 960) {

return {  

  name: "evening",  
  label: "Evening",  
  day: now.date,  
  month: now.monthKey,  
  open: true,  
  canSubmit: true  

};

}

return {

name: "closed",  
label: "Closed",  
day: now.date,  
month: now.monthKey,  
open: false,  
canSubmit: false

};

}

// ==================================================
// SESSION DEADLINE
// ==================================================

function getSessionDeadline(sessionName) {

const now = getKenyaDateParts();

if (sessionName === "morning") {

return {  

  year: now.year,  
  month: now.month,  
  day: now.day,  
  hour: 10,  
  minute: 0  

};

}

if (sessionName === "evening") {

return {  

  year: now.year,  
  month: now.month,  
  day: now.day,  
  hour: 24,  
  minute: 0  

};

}

return null;

}

// ==================================================
// CHECK NORMAL SUBMISSION
// ==================================================

function canSubmitSession(sessionName) {

const now = getKenyaDateParts();

if (sessionName === "morning") {

return now.timeMinutes < 600;

}

if (sessionName === "evening") {

return now.timeMinutes >= 960;

}

return false;

}

// ==================================================
// CHECK ADMIN EDIT PERMISSION
// ==================================================

function canAdminEditRecord(record) {

const now = getKenyaDateParts();

if (!record || !record.session) {
return false;
}

if (record.day !== now.date) {
return false;
}

if (record.session === "morning") {

return now.timeMinutes < 960;

}

if (record.session === "evening") {

return now.timeMinutes >= 960;

}

return false;

}

// ==================================================
// BUSINESS ERROR
// ==================================================

function milkError(code, message) {

const error = new Error(message);

error.code = code;

return error;

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
// FINALIZE ONE EXPIRED SESSION
// ==================================================

exports.finalizeExpiredMilkSession = async (
sessionName,
day
) => {

if (!sessionName || !day) {
return [];
}

const dairies =
await exports.getMilkingAnimals();

if (!dairies.length) {
return [];
}

const existing =
await Milk.find({
day,
session: sessionName
})
.select("dairy")
.lean();

const recorded =
new Set(
existing.map(
record =>
record.dairy.toString()
)
);

const docs = [];

for (const dairy of dairies) {

const dairyId =  
  dairy._id.toString();  

if (recorded.has(dairyId)) {  
  continue;  
}  

docs.push({  

  dairy: dairy._id,  

  liters: 0,  

  remarks: "Not Milked",  

  recordedBy: null,  

  recordedBySystem: true,  

  session: sessionName,  

  date: new Date(),  

  day,  

  month: day.slice(0, 7)  

});

}

if (!docs.length) {
return [];
}

try {

return await Milk.insertMany(  
  docs,  
  {  
    ordered: false  
  }  
);

} catch (error) {

/*  
 * Duplicate-key errors can happen if two requests  
 * try to finalize the same session at the same time.  
 *  
 * Existing records are harmless here.  
 */  

if (error?.code === 11000) {  
  return [];  
}  

throw error;

}

};

// ==================================================
// FINALIZE EXPIRED SESSIONS
// ==================================================

exports.finalizeExpiredMilkSessions = async () => {

const now = getKenyaDateParts();

const results = [];

// ------------------------------------------------
// MORNING
// ------------------------------------------------

if (now.timeMinutes >= 600) {

results.push(  
  await exports.finalizeExpiredMilkSession(  
    "morning",  
    now.date  
  )  
);

}

// ------------------------------------------------
// PREVIOUS EVENING
// ------------------------------------------------

if (now.timeMinutes < 600) {

const previousDay =  
  new Date(  
    `${now.date}T00:00:00+03:00`  
  );  

previousDay.setDate(  
  previousDay.getDate() - 1  
);  

const previousYear =  
  previousDay.getFullYear();  

const previousMonth =  
  String(  
    previousDay.getMonth() + 1  
  ).padStart(2, "0");  

const previousDate =  
  String(  
    previousDay.getDate()  
  ).padStart(2, "0");  

const previousDayString =  
  `${previousYear}-${previousMonth}-${previousDate}`;  

results.push(  
  await exports.finalizeExpiredMilkSession(  
    "evening",  
    previousDayString  
  )  
);

}

return results.flat();

};

// ==================================================
// GET MILK PAGE DATA
//
// IMPORTANT:
//
// Each dairy receives:
//
// morning: saved morning record or null
// evening: saved evening record or null
//
// This allows the EJS to display the actual
// recorded value after saving.
//
// Non-admin users can simply display the value.
// Admin users can display the edit control.
// ==================================================

exports.getMilkPageData = async () => {

/*

Finalize sessions that have expired before

loading the page.
*/


await exports.finalizeExpiredMilkSessions();

const dairies =
await exports.getMilkingAnimals();

const current =
getMilkSession();

const today =
current.day;

// ------------------------------------------------
// GET TODAY'S MORNING RECORDS
// ------------------------------------------------

const morningRecords =
await Milk.find({
day: today,
session: "morning"
})
.populate(
"recordedBy",
"name"
)
.lean();

// ------------------------------------------------
// GET TODAY'S EVENING RECORDS
// ------------------------------------------------

const eveningRecords =
await Milk.find({
day: today,
session: "evening"
})
.populate(
"recordedBy",
"name"
)
.lean();

// ------------------------------------------------
// CREATE MAPS
// ------------------------------------------------

const morningMap =
new Map();

for (const record of morningRecords) {

if (!record.dairy) {  
  continue;  
}  

morningMap.set(  
  record.dairy.toString(),  
  record  
);

}

const eveningMap =
new Map();

for (const record of eveningRecords) {

if (!record.dairy) {  
  continue;  
}  

eveningMap.set(  
  record.dairy.toString(),  
  record  
);

}

// ------------------------------------------------
// ATTACH RECORDS TO EACH ANIMAL
// ------------------------------------------------

const dairiesWithRecords =
dairies.map(dairy => {

const dairyId =  
    dairy._id.toString();  

  const morning =  
    morningMap.get(  
      dairyId  
    ) || null;  

  const evening =  
    eveningMap.get(  
      dairyId  
    ) || null;  

  return {  

    ...dairy,  

    morning,  

    evening,  

    /*  
     * Convenience properties for EJS.  
     */  

    morningRecorded:  
      !!morning,  

    eveningRecorded:  
      !!evening,  

    morningLiters:  
      morning  
        ? Number(morning.liters || 0)  
        : null,  

    eveningLiters:  
      evening  
        ? Number(evening.liters || 0)  
        : null  

  };  

});

// ------------------------------------------------
// CURRENT DISPLAY RECORDS
// ------------------------------------------------

let displayRecords = [];

if (current.name === "morning") {

displayRecords =  
  morningRecords;

}

else if (current.name === "closed") {

/*  
 * During 10:00 - 15:59 the morning  
 * collection remains visible.  
 */  

displayRecords =  
  morningRecords;

}

else if (current.name === "evening") {

displayRecords =  
  eveningRecords;

}

return {

dairies:  
  dairiesWithRecords,  

milkRecords:  
  displayRecords,  

morningRecords,  

eveningRecords,  

session:  
  current.name,  

sessionInfo:  
  current,  

canSubmit:  
  current.canSubmit,  

canEditMorning:  
  current.name === "morning" ||  
  current.name === "closed",  

canEditEvening:  
  current.name === "evening"

};

};

// ==================================================
// SAVE MILK RECORDS
//
// NORMAL USER SUBMISSION
//
// IMPORTANT:
// This function NEVER returns success for an empty
// submission.
//
// Every submitted animal must actually produce a
// database record.
// ==================================================

exports.saveMilkRecords = async (
records,
user
) => {

// ------------------------------------------------
// VALIDATE USER
// ------------------------------------------------

if (!user || !user._id) {

throw milkError(  
  "MILK_USER_REQUIRED",  
  "User ID is required to record milk."  
);

}

// ------------------------------------------------
// VALIDATE SUBMISSION
// ------------------------------------------------

if (!records) {

throw milkError(  
  "MILK_NO_RECORDS",  
  "No milk records were submitted."  
);

}

/*

Depending on the EJS form, req.body.records

can sometimes arrive as:

object

array

Normalize it here.
*/


let normalizedRecords = [];

if (Array.isArray(records)) {

normalizedRecords =  
  records;

}

else if (
typeof records === "object"
) {

/*  
 * Supports forms where records are submitted  
 * using indexed/object field names.  
 */  

normalizedRecords =  
  Object.values(records);

}

if (!normalizedRecords.length) {

throw milkError(  
  "MILK_NO_RECORDS",  
  "No milk records were submitted."  
);

}

// ------------------------------------------------
// CURRENT SESSION
// ------------------------------------------------

const current =
getMilkSession();

if (!current.canSubmit) {

throw milkError(  

  "MILK_TIME_CLOSED",  

  "Milk submission is currently closed. Morning collection is available from midnight to 10:00 AM, while evening collection is available from 4:00 PM until midnight."  

);

}

const session =
current.name;

const day =
current.day;

// ------------------------------------------------
// VALIDATE RECORD STRUCTURE
// ------------------------------------------------

const cleanedRecords = [];

for (
const record
of normalizedRecords
) {

if (!record) {  
  continue;  
}  

/*  
 * Support both:  
 *  
 * record.dairy  
 *  
 * and:  
 *  
 * record.dairyId  
 */  

const dairyId =  
  record.dairy ||  
  record.dairyId;  

if (!dairyId) {  
  continue;  
}  

if (  
  !mongoose.Types.ObjectId.isValid(  
    dairyId  
  )  
) {  

  throw milkError(  
    "MILK_INVALID_ANIMAL",  
    "One of the submitted dairy animal IDs is invalid."  
  );  

}  

const liters =  
  Number(  
    record.liters  
  );  

/*  
 * Empty string is NOT a valid submission.  
 *  
 * Zero IS valid.  
 */  

if (  
  record.liters === undefined ||  
  record.liters === null ||  
  record.liters === "" ||  
  Number.isNaN(liters) ||  
  liters < 0  
) {  

  throw milkError(  

    "MILK_INVALID_QUANTITY",  

    "Please enter a valid milk quantity for every animal being recorded."  

  );  

}  

cleanedRecords.push({  

  dairy:  
    dairyId,  

  liters,  

  remarks:  
    typeof record.remarks === "string"  
      ? record.remarks.trim()  
      : ""  

});

}

// ------------------------------------------------
// DO NOT REPORT SUCCESS FOR NOTHING
// ------------------------------------------------

if (!cleanedRecords.length) {

throw milkError(  

  "MILK_NO_RECORDS",  

  "No valid milk records were submitted. Please enter a milk quantity before saving."  

);

}

// ------------------------------------------------
// PREVENT DUPLICATE ANIMALS IN SAME FORM
// ------------------------------------------------

const submittedIds =
new Set();

for (
const record
of cleanedRecords
) {

const dairyId =  
  record.dairy.toString();  

if (  
  submittedIds.has(  
    dairyId  
  )  
) {  

  throw milkError(  

    "MILK_DUPLICATE_RECORD",  

    "The same dairy animal was submitted more than once."  

  );  

}  

submittedIds.add(  
  dairyId  
);

}

// ------------------------------------------------
// VERIFY ANIMALS EXIST AND ARE MILKING
// ------------------------------------------------

const dairyIds =
cleanedRecords.map(
record =>
record.dairy
);

const dairies =
await Dairy.find({

_id: {  
    $in: dairyIds  
  },  

  isMilking: true  

})  
  .select("_id code name isMilking")  
  .lean();

const validDairyIds =
new Set(
dairies.map(
dairy =>
dairy._id.toString()
)
);

for (
const record
of cleanedRecords
) {

if (  
  !validDairyIds.has(  
    record.dairy.toString()  
  )  
) {  

  throw milkError(  

    "MILK_INVALID_ANIMAL",  

    "One or more selected animals are no longer marked as milking."  

  );  

}

}

// ------------------------------------------------
// CHECK EXISTING RECORDS
// ------------------------------------------------

const existing =
await Milk.find({

dairy: {  
    $in: dairyIds  
  },  

  day,  

  session  

})  
  .select(  
    "dairy liters remarks session day"  
  )  
  .lean();

if (existing.length) {

throw milkError(  

  "MILK_ALREADY_RECORDED",  

  "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."  

);

}

// ------------------------------------------------
// BUILD DOCUMENTS
// ------------------------------------------------

const docs =
cleanedRecords.map(
record => ({

dairy:  
      record.dairy,  

    liters:  
      record.liters,  

    remarks:  
      record.remarks,  

    recordedBy:  
      user._id,  

    recordedBySystem:  
      false,  

    session,  

    date:  
      new Date(),  

    day,  

    month:  
      current.month  

  })  
);

// ------------------------------------------------
// INSERT
// ------------------------------------------------

let saved;

try {

saved =  
  await Milk.insertMany(  
    docs,  
    {  
      ordered: true  
    }  
  );

} catch (error) {

console.error(  
  "Milk insert error:",  
  error  
);  

if (  
  error?.code === 11000  
) {  

  throw milkError(  

    "MILK_ALREADY_RECORDED",  

    "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."  

  );  

}  

throw error;

}

// ------------------------------------------------
// VERY IMPORTANT
//
// Do not let the controller display "success"
// unless MongoDB actually returned saved records.
// ------------------------------------------------

if (
!saved ||
!Array.isArray(saved) ||
saved.length !== docs.length
) {

throw milkError(  

  "MILK_SAVE_FAILED",  

  "The milk records could not be saved. Please try again."  

);

}

return saved;

};

// ==================================================
// EDIT EXISTING MILK RECORD
//
// ADMIN ONLY
// ==================================================

exports.editMilkRecord = async ({
recordId,
liters,
remarks,
user
}) => {

// ------------------------------------------------
// ADMIN CHECK
// ------------------------------------------------

if (
!user ||
user.role !== "admin"
) {

throw milkError(  

  "MILK_ADMIN_REQUIRED",  

  "Only an administrator can edit an existing milk record."  

);

}

// ------------------------------------------------
// VALID ID
// ------------------------------------------------

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

// ------------------------------------------------
// ONLY TODAY
// ------------------------------------------------

if (
record.day !== now.date
) {

throw milkError(  

  "MILK_TIME_CLOSED",  

  "This milk record belongs to a previous day and can no longer be edited."  

);

}

// ------------------------------------------------
// MORNING
// ------------------------------------------------

if (
record.session === "morning"
) {

if (  
  now.timeMinutes >= 960  
) {  

  throw milkError(  

    "MILK_TIME_CLOSED",  

    "Morning milk records can only be edited before the evening collection window begins at 4:00 PM."  

  );  

}

}

// ------------------------------------------------
// EVENING
// ------------------------------------------------

else if (
record.session === "evening"
) {

if (  
  now.timeMinutes < 960  
) {  

  throw milkError(  

    "MILK_TIME_CLOSED",  

    "Evening milk records can only be edited from 4:00 PM until midnight."  

  );  

}

}

else {

throw milkError(  

  "MILK_TIME_CLOSED",  

  "This milk record cannot be edited."  

);

}

// ------------------------------------------------
// VALIDATE QUANTITY
// ------------------------------------------------

if (
liters === undefined ||
liters === null ||
liters === ""
) {

throw milkError(  

  "MILK_INVALID_QUANTITY",  

  "Milk quantity is required."  

);

}

const quantity =
Number(liters);

if (
Number.isNaN(quantity) ||
quantity < 0
) {

throw milkError(  

  "MILK_INVALID_QUANTITY",  

  "Invalid milk quantity."  

);

}

// ------------------------------------------------
// UPDATE
// ------------------------------------------------

record.liters =
quantity;

record.remarks =
typeof remarks === "string"
? remarks.trim()
: "";

/*

Keep original recordedBy.

Admin is editing the record, not becoming

its original recorder.
*/


await record.save();

return record;

};

// ==================================================
// GET CURRENT MILK PRICE
// ==================================================

exports.getCurrentPrice =
async () => {

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

exports.toggleMilkingStatus =
async ({
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

exports.getDailyStats =
async (day) => {

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
    ) -  
    consumed  

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

exports.getMonthlyStats =
async (month) => {

const report =  
  await Milk.getMonthlyReport(  
    month  
  );  

const dairies =  
  await Dairy.find()  
    .lean();  

const dairyMap = {};  

dairies.forEach(  
  dairy => {  

    dairyMap[  
      dairy._id.toString()  
    ] = dairy;  

  }  
);  

const records =  
  (  
    report.records || []  
  ).map(  
    record => ({  

      dairy:  
        dairyMap[  
          record.dairy.toString()  
        ] || null,  

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

let totalConsumed = 0;  
let totalCash = 0;  
let totalPrice = 0;  

const sales = [];  

summaries.forEach(  
  summary => {  

    totalPrice +=  
      Number(  
        summary.price || 0  
      );  

    (  
      summary.sales || []  
    ).forEach(  
      sale => {  

        totalConsumed +=  
          Number(  
            sale.liters || 0  
          );  

        totalCash +=  
          Number(  
            sale.cash || 0  
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
// ==================================================

exports.saveDailyStats =
async ({
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

const numericPrice =  
  Number(price);  

if (  
  Number.isNaN(numericPrice) ||  
  numericPrice < 0  
) {  

  throw new Error(  
    "Invalid milk price."  
  );  

}  

summary.price =  
  numericPrice;  

summary.consumed =  
  consumed;  

summary.available =  
  Math.max(  

    0,  

    Number(  
      report.stats.total || 0  
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
  getKenyaDateParts().date;  

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

standingOrders.forEach(  
  order => {  

    order.saleRecordedToday =  
      (  
        summary.sales || []  
      ).some(  
        sale =>  

          sale.standingOrderId &&  
          sale.standingOrderId.toString() ===  
          order._id.toString()  
      );  

    order.isFuture =  
      order.effectiveDate &&  
      new Date(  
        order.effectiveDate  
      ) > new Date();  

  }  
);  

const manualSales =  
  (  
    summary.sales || []  
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
    report.stats.total || 0  
  );  

const totalSales =  
  (  
    summary.sales || []  
  ).reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.liters || 0  
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
    summary.price || 50,  

  totalSales,  

  availableMilk  

};

};

// ==================================================
// SUBMIT MANUAL SALE
// ==================================================

exports.submitManualSale =
async ({
customerName,
liters
}) => {

if (  
  !customerName ||  
  !customerName.trim()  
) {  

  throw new Error(  
    "Customer name is required."  
  );  

}  

const quantity =  
  Number(liters);  

if (  
  Number.isNaN(quantity) ||  
  quantity <= 0  
) {  

  throw new Error(  
    "Invalid milk quantity."  
  );  

}  

const today =  
  getKenyaDateParts().date;  

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
  await Milk.getDailyReport(  
    today  
  );  

const produced =  
  Number(  
    report.stats.total || 0  
  );  

const sold =  
  (  
    summary.sales || []  
  ).reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.liters || 0  
      ),  
    0  
  );  

const available =  
  produced - sold;  

if (quantity > available) {  

  throw new Error(  
    `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`  
  );  

}  

summary.sales.push({  

  customerName:  
    customerName.trim(),  

  liters:  
    quantity,  

  price,  

  cash:  
    quantity * price  

});  

summary.consumed =  
  summary.sales.reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.liters || 0  
      ),  
    0  
  );  

summary.cash =  
  summary.sales.reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.cash || 0  
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
  getKenyaDateParts().date;  

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
  (  
    summary.sales || []  
  ).some(  
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
  await Milk.getDailyReport(  
    today  
  );  

const produced =  
  Number(  
    report.stats.total || 0  
  );  

const sold =  
  (  
    summary.sales || []  
  ).reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.liters || 0  
      ),  
    0  
  );  

const available =  
  produced - sold;  

const orderLiters =  
  Number(order.liters);  

if (  
  Number.isNaN(orderLiters) ||  
  orderLiters <= 0  
) {  

  throw new Error(  
    "Invalid standing order quantity."  
  );  

}  

if (orderLiters > available) {  

  throw new Error(  
    `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`  
  );  

}  

summary.sales.push({  

  customerName:  
    order.customerName,  

  liters:  
    orderLiters,  

  price,  

  cash:  
    orderLiters * price,  

  standingOrderId:  
    order._id  

});  

summary.consumed =  
  summary.sales.reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.liters || 0  
      ),  
    0  
  );  

summary.cash =  
  summary.sales.reduce(  
    (sum, sale) =>  
      sum +  
      Number(  
        sale.cash || 0  
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

const numericPrice =  
  Number(price);  

if (  
  Number.isNaN(numericPrice) ||  
  numericPrice < 0  
) {  

  throw new Error(  
    "Invalid milk price."  
  );  

}  

const today =  
  getKenyaDateParts().date;  

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
  numericPrice;  

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

if (  
  !customerName ||  
  !customerName.trim()  
) {  

  throw new Error(  
    "Customer name is required."  
  );  

}  

const quantity =  
  Number(liters);  

if (  
  Number.isNaN(quantity) ||  
  quantity <= 0  
) {  

  throw new Error(  
    "Invalid standing order quantity."  
  );  

}  

return StandingOrder.create({  

  customerName:  
    customerName.trim(),  

  liters:  
    quantity  

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
  )  
    .lean();  

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

// ==================================================
// OPTIONAL EXPORTS
// ==================================================

exports.getMilkSession =
getMilkSession;

exports.getKenyaDateParts =
getKenyaDateParts;

exports.getSessionDeadline =
getSessionDeadline;

exports.canSubmitSession =
canSubmitSession;

exports.canAdminEditRecord =
canAdminEditRecord;