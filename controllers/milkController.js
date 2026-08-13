// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// MILK CONTROLLER
//
// Responsibilities:
//
// • Receive HTTP requests
// • Validate request input
// • Enforce controller-level permissions
// • Call milkService
// • Prepare safe data for EJS
// • Render EJS pages
// • Redirect after successful mutations
//
// Business logic remains in milkService.js.
//
// ==========================================================

const mongoose = require("mongoose");

const milkService =
  require("../services/milkService");

const Dairy =
  require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const VALID_SESSIONS = [
  "morning",
  "evening"
];


// ==========================================================
// BASIC HELPERS
// ==========================================================

function isAdmin(req) {

  return req?.user?.role === "admin";

}


// ----------------------------------------------------------
// Redirect with error
// ----------------------------------------------------------

function redirectError(
  res,
  message,
  path = "/milk"
) {

  return res.redirect(
    `${path}?error=${encodeURIComponent(
      message || "An error occurred."
    )}`
  );

}


// ----------------------------------------------------------
// Convert value to number safely
// ----------------------------------------------------------

function toNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


// ----------------------------------------------------------
// Convert value to string safely
// ----------------------------------------------------------

function toText(value, fallback = "") {

  if (
    value === undefined ||
    value === null
  ) {

    return fallback;

  }

  return String(value);

}


// ----------------------------------------------------------
// Normalize MongoDB ObjectId to string
// ----------------------------------------------------------

function idToString(value) {

  if (!value) {
    return "";
  }

  if (
    typeof value === "object" &&
    value._id
  ) {

    return String(value._id);

  }

  return String(value);

}


// ----------------------------------------------------------
// Check ObjectId
// ----------------------------------------------------------

function isValidObjectId(value) {

  return mongoose.Types.ObjectId.isValid(
    value
  );

}


// ----------------------------------------------------------
// Normalize assigned farms
//
// Handles:
//
// [
//   ObjectId(...),
//   "ObjectId..."
// ]
//
// and also:
//
// [
//   { _id: ObjectId(...) }
// ]
// ----------------------------------------------------------

function normalizeAssignedFarmIds(
  assignedFarm
) {

  if (
    !Array.isArray(assignedFarm)
  ) {

    return [];

  }

  return assignedFarm
    .map(idToString)
    .filter(Boolean)
    .filter(
      id =>
        isValidObjectId(id)
    );

}


// ==========================================================
// SAFE FARM OBJECT
// ==========================================================
//
// Ensures the EJS always receives:
//
// farm._id
// farm.name
// farm.code
//
// while preserving all other fields from MongoDB.
//
// ==========================================================

function prepareFarm(farm) {

  if (!farm) {
    return null;
  }

  const prepared = {
    ...farm
  };

  prepared._id =
    farm._id
      ? String(farm._id)
      : "";

  prepared.name =
    toText(
      farm.name,
      "Unnamed Dairy Farm"
    );

  prepared.code =
    farm.code !== undefined &&
    farm.code !== null
      ? farm.code
      : "";

  prepared.numericCode =
    toNumber(
      farm.code,
      NaN
    );

  return prepared;
}


// ==========================================================
// SAFE ANIMAL OBJECT
// ==========================================================
//
// We deliberately preserve the entire animal returned by
// milkService.
//
// This is important because milk.ejs may need fields such as:
//
// • _id
// • name
// • code
// • assetCode
// • breed
// • profileImage
// • image
// • isMilking
// • milk records
// • morning
// • evening
//
// etc.
//
// We only normalize the fields needed for grouping.
//
// ==========================================================

function prepareAnimal(animal) {

  if (!animal) {
    return null;
  }

  const prepared = {
    ...animal
  };

  prepared._id =
    animal._id
      ? String(animal._id)
      : "";

  prepared.code =
    animal.code !== undefined &&
    animal.code !== null
      ? animal.code
      : "";

  prepared.assetCode =
    animal.assetCode !== undefined &&
    animal.assetCode !== null
      ? animal.assetCode
      : "";

  prepared.numericCode =
    toNumber(
      animal.code,
      NaN
    );

  prepared.numericAssetCode =
    toNumber(
      animal.assetCode,
      NaN
    );

  prepared.name =
    toText(
      animal.name,
      "Unnamed Animal"
    );

  return prepared;
}


// ==========================================================
// PREPARE MILK PAGE DATA
// ==========================================================
//
// This function is intentionally separate from getMilkPage.
//
// It makes the controller easier to reason about and ensures
// that the EJS receives a predictable structure.
//
// ==========================================================

async function buildMilkPageData(req) {

  const user =
    req.user || {};

  const admin =
    user.role === "admin";


  // ========================================================
  // GET DATA FROM MILK SERVICE
  // ========================================================

  const serviceData =
    await milkService.getMilkPageData(
      user
    );


  // ========================================================
  // SESSION
  // ========================================================

  const session =
    serviceData?.session ||
    "closed";


  // ========================================================
  // RAW DAIRIES / ANIMALS FROM SERVICE
  // ========================================================

  let serviceDairies =
    Array.isArray(
      serviceData?.dairies
    )
      ? serviceData.dairies
      : [];


  // --------------------------------------------------------
  // Some service implementations may return animals under
  // "animals" instead of "dairies".
  //
  // Supporting both costs nothing and prevents an empty
  // page when the service uses the newer property name.
  // --------------------------------------------------------

  if (
    serviceDairies.length === 0 &&
    Array.isArray(
      serviceData?.animals
    )
  ) {

    serviceDairies =
      serviceData.animals;

  }


  // ========================================================
  // PREPARE FARM QUERY
  // ========================================================

  const farmQuery = {

    code: {
      $lt: 0
    },

    status: "active"

  };


  // ========================================================
  // WORKER ACCESS RESTRICTION
  // ========================================================

  if (!admin) {

    const assignedFarmIds =
      normalizeAssignedFarmIds(
        user.assignedFarm
      );


    // ------------------------------------------------------
    // Worker has no assigned farms
    // ------------------------------------------------------

    if (
      assignedFarmIds.length === 0
    ) {

      return {

        farms: [],

        dairies: [],

        animals: [],

        session,

        isAdmin: false,

        user,

        success:
          req.query?.success === "1",

        error:
          req.query?.error || ""

      };

    }


    farmQuery._id = {
      $in: assignedFarmIds
    };

  }


  // ========================================================
  // LOAD DAIRY FARMS
  // ========================================================

  const rawFarms =
    await Dairy
      .find(farmQuery)
      .sort({
        code: 1
      })
      .lean();


  const farms =
    rawFarms
      .map(prepareFarm)
      .filter(Boolean);


  // ========================================================
  // FARM LOOKUP BY CODE
  // ========================================================
  //
  // Example:
  //
  // farm.code = -5
  //
  // animal.assetCode = -5
  //
  // ========================================================

  const farmByCode =
    new Map();


  for (
    const farm of farms
  ) {

    const numericCode =
      toNumber(
        farm.code,
        NaN
      );


    if (
      !Number.isFinite(
        numericCode
      )
    ) {

      continue;

    }


    farmByCode.set(
      numericCode,
      farm
    );

  }


  // ========================================================
  // PREPARE ANIMALS
  // ========================================================
  //
  // Only identified animals are allowed into milk
  // collection tables.
  //
  // Animal:
  //
  //     code > 0
  //
  // Parent:
  //
  //     assetCode < 0
  //
  // ========================================================

  const animals =
    serviceDairies
      .map(prepareAnimal)
      .filter(Boolean)
      .filter(animal => {

        const animalCode =
          animal.numericCode;

        const assetCode =
          animal.numericAssetCode;


        return (

          Number.isFinite(
            animalCode
          ) &&

          animalCode > 0 &&

          Number.isFinite(
            assetCode
          ) &&

          assetCode < 0

        );

      });


  // ========================================================
  // GROUP ANIMALS BY FARM
  // ========================================================

  const animalsByFarm =
    new Map();


  for (
    const animal of animals
  ) {

    const assetCode =
      animal.numericAssetCode;


    const farm =
      farmByCode.get(
        assetCode
      );


    // ------------------------------------------------------
    // The animal belongs to a farm that the current user
    // cannot see.
    //
    // Do not expose it.
    // ------------------------------------------------------

    if (!farm) {

      continue;

    }


    if (
      !animalsByFarm.has(
        assetCode
      )
    ) {

      animalsByFarm.set(
        assetCode,
        []
      );

    }


    animalsByFarm
      .get(assetCode)
      .push(animal);

  }


  // ========================================================
  // BUILD FARM GROUPS
  // ========================================================
  //
  // EJS receives:
  //
  // farms = [
  //
  //   {
  //     farm: {...},
  //     farmId: "...",
  //     farmName: "...",
  //     farmCode: -1,
  //     animals: [...]
  //   }
  //
  // ]
  //
  // ========================================================

  const groupedFarms = [];


  for (
    const farm of farms
  ) {

    const farmCode =
      toNumber(
        farm.code,
        NaN
      );


    if (
      !Number.isFinite(
        farmCode
      )
    ) {

      continue;

    }


    const farmAnimals =
      animalsByFarm.get(
        farmCode
      ) || [];


    // ------------------------------------------------------
    // Keep farms even when they have no animals.
    //
    // This is useful because the EJS can then display:
    //
    // "No milking animals on this farm."
    //
    // If your existing EJS specifically requires only farms
    // with animals, it can simply skip empty groups.
    // ------------------------------------------------------

    groupedFarms.push({

      farm,

      farmId:
        String(
          farm._id
        ),

      farmName:
        farm.name,

      farmCode:
        farm.code,

      numericFarmCode:
        farmCode,

      animals:
        farmAnimals,

      animalCount:
        farmAnimals.length

    });

  }


  // ========================================================
  // SORT FARMS
  // ========================================================

  groupedFarms.sort(
    (a, b) =>
      Number(a.numericFarmCode) -
      Number(b.numericFarmCode)
  );


  // ========================================================
  // FLAT ANIMAL LIST
  // ========================================================
  //
  // This preserves compatibility with old milk.ejs code
  // which may still use:
  //
  //     dairies
  //
  // ========================================================

  const visibleDairies =
    groupedFarms.flatMap(
      group =>
        group.animals
    );


  // ========================================================
  // RETURN EVERYTHING EJS MAY NEED
  // ========================================================

  return {

    // ------------------------------------------------------
    // PRIMARY FARM DATA
    // ------------------------------------------------------

    farms:
      groupedFarms,


    // ------------------------------------------------------
    // BACKWARD COMPATIBILITY
    // ------------------------------------------------------

    dairies:
      visibleDairies,


    animals:
      visibleDairies,


    // ------------------------------------------------------
    // SESSION
    // ------------------------------------------------------

    session,


    // ------------------------------------------------------
    // AUTH
    // ------------------------------------------------------

    isAdmin:
      admin,

    user,


    // ------------------------------------------------------
    // QUERY RESULT
    // ------------------------------------------------------

    success:
      req.query?.success === "1",

    error:
      req.query?.error || "",

    // ------------------------------------------------------
    // OPTIONAL SERVICE DATA
    //
    // Preserve any additional properties supplied by the
    // milk service without allowing them to overwrite the
    // controller's authoritative fields above.
    // ------------------------------------------------------

    ...serviceData,

    // ------------------------------------------------------
    // Re-apply these after spreading serviceData so the
    // controller's prepared structures always win.
    // ------------------------------------------------------

    farms:
      groupedFarms,

    dairies:
      visibleDairies,

    animals:
      visibleDairies,

    session,

    isAdmin:
      admin,

    user,

    success:
      req.query?.success === "1",

    error:
      req.query?.error || ""

  };

}


// ==========================================================
// GET MILK PAGE
// ==========================================================
//
// GET /milk
//
// ==========================================================

exports.getMilkPage =
async (
  req,
  res
) => {

  try {

    const data =
      await buildMilkPageData(
        req
      );


    return res.render(
      "milk",
      data
    );

  }

  catch (err) {

    console.error(
      "Milk page error:",
      err
    );


    return res
      .status(500)
      .render(
        "milk",
        {

          farms: [],

          dairies: [],

          animals: [],

          session: "closed",

          isAdmin:
            isAdmin(req),

          user:
            req.user || {},

          success: false,

          error:
            "Error loading milk collection page."

        }
      );

  }

};


// ==========================================================
// SUBMIT MILK
// ==========================================================
//
// POST /milk
//
// Expected:
//
// dairy
// session
// liters
// remarks
//
// ==========================================================

exports.submitMilk =
async (
  req,
  res
) => {

  try {

    const {
      dairy,
      session,
      liters,
      remarks
    } = req.body || {};


    // ======================================================
    // ANIMAL
    // ======================================================

    if (!dairy) {

      throw new Error(
        "No dairy animal was selected."
      );

    }


    // ======================================================
    // LITERS
    // ======================================================

    if (
      liters === undefined ||
      liters === null ||
      liters === ""
    ) {

      throw new Error(
        "Milk quantity is required."
      );

    }


    const numericLiters =
      Number(liters);


    if (
      !Number.isFinite(
        numericLiters
      ) ||
      numericLiters < 0
    ) {

      throw new Error(
        "Milk quantity must be a valid number."
      );

    }


    // ======================================================
    // SESSION
    // ======================================================

    if (
      session &&
      !VALID_SESSIONS.includes(
        session
      )
    ) {

      throw new Error(
        "Invalid milk collection session."
      );

    }


    // ======================================================
    // SAVE
    // ======================================================

    await milkService.saveMilkRecords(
      [
        {

          dairy,

          liters:
            numericLiters,

          remarks:
            remarks || "",

          session:
            session || undefined

        }
      ],
      req.user
    );


    // ======================================================
    // SUCCESS
    // ======================================================

    return res.redirect(
      "/milk?success=1"
    );

  }

  catch (err) {

    console.error(
      "Submit milk error:",
      err
    );


    return redirectError(
      res,
      err.message ||
        "Unable to save milk record."
    );

  }

};


// ==========================================================
// GET EDIT MILK
// ==========================================================
//
// Compatibility route.
//
// GET /milk/edit/:id
//
// ==========================================================

exports.getEditMilk =
async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    if (!id) {

      return redirectError(
        res,
        "Milk record was not specified."
      );

    }


    if (!isAdmin(req)) {

      return redirectError(
        res,
        "Only administrators can edit milk records."
      );

    }


    if (
      !isValidObjectId(id)
    ) {

      return redirectError(
        res,
        "Invalid milk record."
      );

    }


    return res.redirect(
      `/milk?edit=${encodeURIComponent(id)}`
    );

  }

  catch (err) {

    console.error(
      "Get edit milk error:",
      err
    );


    return redirectError(
      res,
      err.message ||
        "Unable to open milk record."
    );

  }

};


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================
//
// POST /milk/:id
//
// ADMIN ONLY
//
// ==========================================================

exports.updateMilkRecord =
async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    // ======================================================
    // ADMIN
    // ======================================================

    if (!isAdmin(req)) {

      return redirectError(
        res,
        "Only administrators can edit milk records."
      );

    }


    // ======================================================
    // ID
    // ======================================================

    if (!id) {

      throw new Error(
        "Milk record ID is missing."
      );

    }


    if (
      !isValidObjectId(id)
    ) {

      throw new Error(
        "Invalid milk record."
      );

    }


    // ======================================================
    // LITERS
    // ======================================================

    const liters =
      req.body?.liters;


    if (
      liters === undefined ||
      liters === null ||
      liters === ""
    ) {

      throw new Error(
        "Milk quantity is required."
      );

    }


    const numericLiters =
      Number(liters);


    if (
      !Number.isFinite(
        numericLiters
      ) ||
      numericLiters < 0
    ) {

      throw new Error(
        "Milk quantity must be a valid number."
      );

    }


    // ======================================================
    // UPDATE
    // ======================================================

    await milkService.editMilkRecord({

      recordId:
        id,

      liters:
        numericLiters,

      remarks:
        req.body?.remarks ||
        "",

      user:
        req.user

    });


    return res.redirect(
      "/milk?success=1"
    );

  }

  catch (err) {

    console.error(
      "Update milk record error:",
      err
    );


    return redirectError(
      res,
      err.message ||
        "Unable to update milk record."
    );

  }

};


// ==========================================================
// GET MILK STATS
// ==========================================================
//
// GET /milkStats
//
// ==========================================================

exports.getMilkStats =
async (
  req,
  res
) => {

  try {

    const type =
      req.query?.type ||
      "day";

    const date =
      req.query?.date;

    const month =
      req.query?.month;


    // ======================================================
    // DAILY
    // ======================================================

    if (
      type === "day"
    ) {

      const kenyaParts =
        milkService.getKenyaDateParts();


      const selectedDate =
        date ||
        kenyaParts.date;


      const data =
        await milkService.getDailyStats(
          selectedDate
        );


      return res.render(
        "milkStats",
        {

          type: "day",

          date:
            selectedDate,

          month: "",

          records:
            Array.isArray(data?.records)
              ? data.records
              : [],

          stats:
            data?.stats || {},

          sales:
            Array.isArray(data?.sales)
              ? data.sales
              : [],

          user:
            req.user || {}

        }
      );

    }


    // ======================================================
    // MONTHLY
    // ======================================================

    if (
      type === "month"
    ) {

      const kenyaParts =
        milkService.getKenyaDateParts();


      const selectedMonth =
        month ||
        kenyaParts.monthKey;


      const data =
        await milkService.getMonthlyStats(
          selectedMonth
        );


      return res.render(
        "milkStats",
        {

          type: "month",

          date: "",

          month:
            selectedMonth,

          records:
            Array.isArray(data?.records)
              ? data.records
              : [],

          stats:
            data?.stats || {},

          sales:
            Array.isArray(data?.sales)
              ? data.sales
              : [],

          user:
            req.user || {}

        }
      );

    }


    // ======================================================
    // INVALID TYPE
    // ======================================================

    return res.render(
      "milkStats",
      {

        type: "",

        date: "",

        month: "",

        records: [],

        stats: {

          total: 0,

          consumed: 0,

          available: 0,

          price: 0,

          cash: 0,

          locked: false,

          avg: 0

        },

        sales: [],

        user:
          req.user || {}

      }
    );

  }

  catch (err) {

    console.error(
      "Milk stats error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Error loading stats."
      );

  }

};


// ==========================================================
// SAVE DAILY STATS
// ==========================================================
//
// POST /milkStats/daily
//
// ==========================================================

exports.saveDailyStats =
async (
  req,
  res
) => {

  try {

    const {
      day,
      price
    } = req.body || {};


    if (!day) {

      throw new Error(
        "Day is required."
      );

    }


    if (!isAdmin(req)) {

      throw new Error(
        "Only administrators can save daily statistics."
      );

    }


    await milkService.saveDailyStats({

      day,

      price

    });


    return res.redirect(
      `/milkStats?type=day&date=${encodeURIComponent(day)}`
    );

  }

  catch (err) {

    console.error(
      "Save daily stats error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to save daily statistics."
      );

  }

};


// ==========================================================
// GET SALES PAGE
// ==========================================================
//
// GET /sales
//
// ==========================================================

exports.getSalesPage =
async (
  req,
  res
) => {

  try {

    const data =
      await milkService.getSalesPageData();


    return res.render(
      "sales",
      {

        standingOrders:
          Array.isArray(
            data?.standingOrders
          )
            ? data.standingOrders
            : [],

        manualSales:
          Array.isArray(
            data?.manualSales
          )
            ? data.manualSales
            : [],

        currentPrice:
          data?.currentPrice ??
          50,

        totalSales:
          Number(
            data?.totalSales || 0
          ),

        availableMilk:
          Number(
            data?.availableMilk || 0
          ),

        user:
          req.user || {}

      }
    );

  }

  catch (err) {

    console.error(
      "Sales page error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Error loading sales page."
      );

  }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================
//
// POST /sales/manual
//
// ==========================================================

exports.submitManualSale =
async (
  req,
  res
) => {

  try {

    const {
      customerName,
      liters
    } = req.body || {};


    if (!customerName) {

      throw new Error(
        "Customer name is required."
      );

    }


    if (
      liters === undefined ||
      liters === null ||
      liters === ""
    ) {

      throw new Error(
        "Liters are required."
      );

    }


    const numericLiters =
      Number(liters);


    if (
      !Number.isFinite(
        numericLiters
      ) ||
      numericLiters <= 0
    ) {

      throw new Error(
        "Liters must be a valid number greater than zero."
      );

    }


    await milkService.submitManualSale({

      customerName,

      liters:
        numericLiters

    });


    return res.redirect(
      "/sales"
    );

  }

  catch (err) {

    console.error(
      "Manual sale error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to save manual sale."
      );

  }

};


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================
//
// POST /sales/standing
//
// ==========================================================

exports.submitStandingOrderSale =
async (
  req,
  res
) => {

  try {

    const {
      standingOrderId
    } = req.body || {};


    if (!standingOrderId) {

      throw new Error(
        "Standing order was not specified."
      );

    }


    await milkService.submitStandingOrderSale({

      standingOrderId

    });


    return res.redirect(
      "/sales"
    );

  }

  catch (err) {

    console.error(
      "Standing sale error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to save standing order sale."
      );

  }

};


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// ADMIN ONLY
//
// ==========================================================

exports.updateMilkPrice =
async (
  req,
  res
) => {

  try {

    if (!isAdmin(req)) {

      return res
        .status(403)
        .send(
          "Only administrators can update the milk price."
        );

    }


    const price =
      Number(
        req.body?.price
      );


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      throw new Error(
        "Milk price must be a valid number."
      );

    }


    await milkService.updateMilkPrice(
      price
    );


    return res.redirect(
      "/sales"
    );

  }

  catch (err) {

    console.error(
      "Price update error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to update milk price."
      );

  }

};


// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order
//
// ==========================================================

exports.addStandingOrder =
async (
  req,
  res
) => {

  try {

    const {
      customerName,
      liters
    } = req.body || {};


    if (!customerName) {

      throw new Error(
        "Customer name is required."
      );

    }


    const numericLiters =
      Number(liters);


    if (
      !Number.isFinite(
        numericLiters
      ) ||
      numericLiters <= 0
    ) {

      throw new Error(
        "Liters must be a valid number greater than zero."
      );

    }


    await milkService.addStandingOrder({

      customerName,

      liters:
        numericLiters

    });


    return res.redirect(
      "/sales"
    );

  }

  catch (err) {

    console.error(
      "Add standing order error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to add standing order."
      );

  }

};


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// POST /sales/omit
//
// ==========================================================

exports.omitStandingOrder =
async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.body || {};


    if (!id) {

      throw new Error(
        "Standing order was not specified."
      );

    }


    await milkService.omitStandingOrder({

      orderId:
        id,

      user:
        req.user

    });


    return res.redirect(
      "/sales"
    );

  }

  catch (err) {

    console.error(
      "Omit standing order error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to omit standing order."
      );

  }

};


// ==========================================================
// MILKING HISTORY
// ==========================================================
//
// GET /milk/history/:dairyId
//
// ==========================================================

exports.getMilkingHistory =
async (
  req,
  res
) => {

  try {

    const {
      dairyId
    } = req.params;


    const month =
      req.query?.month;


    if (!dairyId) {

      throw new Error(
        "Dairy animal was not specified."
      );

    }


    const data =
      await milkService.getMilkingHistory({

        dairyId,

        month,

        user:
          req.user

      });


    return res.render(
      "milkingHistory",
      {

        dairy:
          data?.dairy || null,

        records:
          Array.isArray(
            data?.records
          )
            ? data.records
            : [],

        grouped:
          data?.grouped || {},

        monthlyTotal:
          Number(
            data?.monthlyTotal || 0
          ),

        hasData:
          Boolean(
            data?.hasData
          ),

        selectedMonth:
          month || "",

        user:
          req.user || {}

      }
    );

  }

  catch (err) {

    console.error(
      "Milking history error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to load milking history."
      );

  }

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// ADMIN ONLY
//
// POST /milk/toggle/:id
//
// ==========================================================

exports.toggleMilkingStatus =
async (
  req,
  res
) => {

  try {

    if (!isAdmin(req)) {

      return res
        .status(403)
        .send(
          "Only administrators can change milking status."
        );

    }


    const {
      id
    } = req.params;


    if (!id) {

      throw new Error(
        "Dairy animal was not specified."
      );

    }


    if (
      !isValidObjectId(id)
    ) {

      throw new Error(
        "Invalid dairy animal."
      );

    }


    await milkService.toggleMilkingStatus({

      dairyId:
        id,

      user:
        req.user

    });


    return res.redirect(
      `/milk/history/${encodeURIComponent(id)}`
    );

  }

  catch (err) {

    console.error(
      "Toggle milking status error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to change milking status."
      );

  }

};


// ==========================================================
// EXPORT INTERNAL HELPER
// ==========================================================
//
// Normally not needed by routes, but exporting this makes
// testing/debugging possible without changing the public
// controller endpoints.
//
// ==========================================================

exports.buildMilkPageData =
  buildMilkPageData;