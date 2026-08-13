// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// MILK CONTROLLER
//
// Responsibilities:
//
// • Receive HTTP requests
// • Validate basic request input
// • Call milkService
// • Render EJS pages
// • Redirect after successful mutations
//
// Business logic remains in milkService.js.
//
// IMPORTANT
// ----------------------------------------------------------
// The /milk page is intentionally kept separate from the
// statistics, sales, history, and milking-status pages.
//
// milk.ejs expects:
//
//     dairies
//     session
//     isAdmin
//     user
//     success
//     error
//
// Each dairy supplied to milk.ejs should already contain:
//
//     dairy._id
//     dairy.name
//     dairy.code
//     dairy.isMilking
//
//     dairy.morning
//     dairy.evening
//
//     dairy.morningRecorded
//     dairy.eveningRecorded
//
//     dairy.morningLiters
//     dairy.eveningLiters
//
// The service is responsible for preparing those values.
//
// ==========================================================


const mongoose =
  require("mongoose");

const milkService =
  require("../services/milkService");


// ==========================================================
// HELPER
// ==========================================================

function redirectError(
  res,
  message,
  path = "/milk"
) {

  return res.redirect(
    `${path}?error=${encodeURIComponent(
      message
    )}`
  );

}


// ==========================================================
// GET MILK PAGE
// ==========================================================
//
// GET /milk
//
// This controller intentionally passes only the data required
// by milk.ejs.
//
// Business logic remains inside milkService.getMilkPageData().
//
// ==========================================================

exports.getMilkPage =
async (
  req,
  res
) => {

  try {

    const data =
      await milkService.getMilkPageData(
        req.user
      );


    const currentSession =
      data?.session ||
      "closed";


    const isAdmin =
      req.user?.role === "admin";


    return res.render(
      "milk",
      {

        // ----------------------------------------------------
        // DAIRIES
        // ----------------------------------------------------
        //
        // The service prepares the dairy objects with the
        // morning/evening record information required by
        // milk.ejs.
        //
        dairies:
          data?.dairies ||
          [],


        // ----------------------------------------------------
        // CURRENT SESSION
        // ----------------------------------------------------

        session:
          currentSession,


        // ----------------------------------------------------
        // AUTHENTICATION / ACCESS
        // ----------------------------------------------------

        isAdmin,

        user:
          req.user,


        // ----------------------------------------------------
        // RESULT POPUP
        // ----------------------------------------------------
        //
        // milk.ejs displays the popup when either value exists.
        //
        success:
          req.query.success === "1",

        error:
          req.query.error ||
          ""

      }
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

          dairies:
            [],

          session:
            "closed",

          isAdmin:
            req.user?.role === "admin",

          user:
            req.user,

          success:
            false,

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
// Expected request body:
//
//     dairy
//     session
//     liters
//     remarks
//
// The controller performs only basic HTTP/input validation.
//
// The service remains responsible for:
//
// • Determining the actual collection session
// • Checking whether the dairy can receive a record
// • Creating the milk record
// • Updating milk summaries
// • Updating farmTotal
// • Any other business rules
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

    } = req.body;


    // ======================================================
    // BASIC INPUT VALIDATION
    // ======================================================

    if (!dairy) {

      throw new Error(
        "No dairy animal was selected."
      );

    }


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
    // SESSION VALIDATION
    // ======================================================
    //
    // The submitted session is checked only to prevent
    // malformed requests.
    //
    // The service remains authoritative about the actual
    // current collection session.
    //
    // ======================================================

    if (
      session &&
      session !== "morning" &&
      session !== "evening"
    ) {

      throw new Error(
        "Invalid milk collection session."
      );

    }


    // ======================================================
    // SAVE MILK RECORD
    // ======================================================
    //
    // IMPORTANT:
    //
    // The controller does NOT calculate farm totals here.
    //
    // milkService.saveMilkRecords() is responsible for saving
    // the record and, after the record is successfully saved,
    // updating the corresponding MilkSummary farmTotal.
    //
    // ======================================================

    await milkService.saveMilkRecords(

      [

        {

          dairy,

          liters:
            numericLiters,

          remarks:
            remarks || "",

          session

        }

      ],

      req.user

    );


    // ======================================================
    // SUCCESS
    // ======================================================
    //
    // milk.ejs reads ?success=1 and displays the success
    // popup.
    //
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
// The actual edit interface is the modal contained directly
// inside milk.ejs.
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


    if (
      req.user?.role !== "admin"
    ) {

      return redirectError(
        res,
        "Only administrators can edit milk records."
      );

    }


    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {

      return redirectError(
        res,
        "Invalid milk record."
      );

    }


    return res.redirect(
      "/milk?edit=" +
      encodeURIComponent(id)
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
// This is the endpoint used by the edit modal in milk.ejs.
//
// The service is responsible for updating the record and
// synchronizing the corresponding farmTotal.
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
    // ADMIN CHECK
    // ======================================================

    if (
      req.user?.role !== "admin"
    ) {

      return redirectError(
        res,
        "Only administrators can edit milk records."
      );

    }


    // ======================================================
    // RECORD ID
    // ======================================================

    if (!id) {

      throw new Error(
        "Milk record ID is missing."
      );

    }


    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {

      throw new Error(
        "Invalid milk record."
      );

    }


    // ======================================================
    // MILK QUANTITY
    // ======================================================

    if (
      req.body.liters === undefined ||
      req.body.liters === null ||
      req.body.liters === ""
    ) {

      throw new Error(
        "Milk quantity is required."
      );

    }


    const numericLiters =
      Number(
        req.body.liters
      );


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
    //
    // The service handles the database update and farmTotal
    // synchronization.
    //
    // ======================================================

    await milkService.editMilkRecord({

      recordId:
        id,

      liters:
        numericLiters,

      remarks:
        req.body.remarks ||
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
// This section is intentionally unchanged.
// It serves milkStats.ejs and must not be affected by the
// milk collection page changes.
//
// ==========================================================

exports.getMilkStats =
async (
  req,
  res
) => {

  try {

    const {

      type =
        "day",

      date,

      month

    } = req.query;


    // ======================================================
    // DAILY REPORT
    // ======================================================

    if (
      type === "day"
    ) {

      const selectedDate =
        date ||
        milkService
          .getKenyaDateParts()
          .date;


      const data =
        await milkService.getDailyStats(
          selectedDate
        );


      return res.render(
        "milkStats",
        {

          type,

          date:
            selectedDate,

          month:
            "",

          records:
            data?.records ||
            [],

          stats:
            data?.stats ||
            {},

          sales:
            data?.sales ||
            [],

          user:
            req.user

        }
      );

    }


    // ======================================================
    // MONTHLY REPORT
    // ======================================================

    if (
      type === "month"
    ) {

      const selectedMonth =
        month ||
        milkService
          .getKenyaDateParts()
          .monthKey;


      const data =
        await milkService.getMonthlyStats(
          selectedMonth
        );


      return res.render(
        "milkStats",
        {

          type,

          date:
            "",

          month:
            selectedMonth,

          records:
            data?.records ||
            [],

          stats:
            data?.stats ||
            {},

          sales:
            data?.sales ||
            [],

          user:
            req.user

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
          req.user

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

exports.saveDailyStats =
async (
  req,
  res
) => {

  try {

    const {

      day,

      price

    } = req.body;


    if (!day) {

      throw new Error(
        "Day is required."
      );

    }


    if (
      req.user?.role !== "admin"
    ) {

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
          data?.standingOrders ||
          [],

        manualSales:
          data?.manualSales ||
          [],

        currentPrice:
          data?.currentPrice ??
          50,

        totalSales:
          data?.totalSales ||
          0,

        availableMilk:
          data?.availableMilk ||
          0,

        user:
          req.user

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

exports.submitManualSale =
async (
  req,
  res
) => {

  try {

    await milkService.submitManualSale({

      customerName:
        req.body.customerName,

      liters:
        req.body.liters

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

exports.submitStandingOrderSale =
async (
  req,
  res
) => {

  try {

    await milkService.submitStandingOrderSale({

      standingOrderId:
        req.body.standingOrderId

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
// ==========================================================

exports.updateMilkPrice =
async (
  req,
  res
) => {

  try {

    if (
      req.user?.role !== "admin"
    ) {

      return res
        .status(403)
        .send(
          "Only administrators can update the milk price."
        );

    }


    const price =
      Number(
        req.body.price
      );


    if (
      !Number.isFinite(
        price
      ) ||
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

exports.addStandingOrder =
async (
  req,
  res
) => {

  try {

    const {

      customerName,

      liters

    } = req.body;


    await milkService.addStandingOrder({

      customerName,

      liters

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

exports.omitStandingOrder =
async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.body;


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

exports.getMilkingHistory =
async (
  req,
  res
) => {

  try {

    const {
      dairyId
    } = req.params;


    const {
      month
    } = req.query;


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
          data?.dairy,

        records:
          data?.records ||
          [],

        grouped:
          data?.grouped ||
          {},

        monthlyTotal:
          data?.monthlyTotal ||
          0,

        hasData:
          data?.hasData ||
          false,

        selectedMonth:
          month ||
          "",

        user:
          req.user

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
// ==========================================================

exports.toggleMilkingStatus =
async (
  req,
  res
) => {

  try {

    if (
      req.user?.role !== "admin"
    ) {

      return res
        .status(403)
        .send(
          "Only administrators can change milking status."
        );

    }


    const {
      id
    } = req.params;


    await milkService.toggleMilkingStatus({

      dairyId:
        id,

      user:
        req.user

    });


    return res.redirect(
      `/milk/history/${id}`
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