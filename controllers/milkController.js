// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// MILK CONTROLLER
//
// Responsibilities:
//
// • Milk record editing
// • Milk statistics
// • Milk sales
// • Standing orders
// • Milk pricing
// • Milking history
// • Milking status
//
// IMPORTANT:
//
// Milk collection page logic for:
//
//     GET  /milk
//     POST /milk
//
// has been moved to:
//
//     controllers/milkCollectController.js
//
// This controller therefore does NOT:
//
// • Render milk.ejs
// • Build milk collection page data
// • Query farms for milk.ejs
// • Query animals for milk.ejs
// • Build milk collection tables
// • Submit new milk collection records
//
// ==========================================================


const mongoose =
  require("mongoose");


const milkService =
  require("../services/milkService");


// ==========================================================
// BASIC HELPERS
// ==========================================================


// ----------------------------------------------------------
// Check administrator
// ----------------------------------------------------------

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
      message ||
      "An error occurred."
    )}`
  );

}


// ----------------------------------------------------------
// Validate MongoDB ObjectId
// ----------------------------------------------------------

function isValidObjectId(value) {

  return mongoose.Types.ObjectId.isValid(
    value
  );

}


// ==========================================================
// GET EDIT MILK
// ==========================================================
//
// GET /milk/edit/:id
//
// Compatibility route.
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


    // ======================================================
    // SUCCESS
    // ======================================================

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

          type:
            "day",

          date:
            selectedDate,

          month:
            "",

          records:
            Array.isArray(
              data?.records
            )
              ? data.records
              : [],

          stats:
            data?.stats || {},

          sales:
            Array.isArray(
              data?.sales
            )
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

          type:
            "month",

          date:
            "",

          month:
            selectedMonth,

          records:
            Array.isArray(
              data?.records
            )
              ? data.records
              : [],

          stats:
            data?.stats || {},

          sales:
            Array.isArray(
              data?.sales
            )
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

        type:
          "",

        date:
          "",

        month:
          "",

        records:
          [],

        stats: {

          total:
            0,

          consumed:
            0,

          available:
            0,

          price:
            0,

          cash:
            0,

          locked:
            false,

          avg:
            0

        },

        sales:
          [],

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


    if (
      !isValidObjectId(dairyId)
    ) {

      throw new Error(
        "Invalid dairy animal."
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
// EXPORT
// ==========================================================
//
// Milk collection is intentionally NOT exported here.
//
// These functions now belong to:
//
//     controllers/milkCollectController.js
//
// Specifically:
//
//     getMilkPage
//     submitMilk
//
// ==========================================================