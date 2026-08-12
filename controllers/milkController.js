// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService =
  require("../services/milkService");


// ==========================================================
// GET MILK PAGE
// ==========================================================

exports.getMilkPage = async (
  req,
  res
) => {

  try {

    const data =
      await milkService.getMilkPageData();


    const currentSession =
      data?.session || "closed";


    const isAdmin =
      req.user?.role === "admin";


    return res.render(
      "milk",
      {

        dairies:
          data?.dairies || [],

        milkRecords:
          data?.milkRecords || [],

        morningRecords:
          data?.morningRecords || [],

        eveningRecords:
          data?.eveningRecords || [],

        session:
          currentSession,

        sessionInfo:
          data?.sessionInfo || null,

        canSubmit:
          data?.canSubmit || false,

        canEditMorning:
          data?.canEditMorning || false,

        canEditEvening:
          data?.canEditEvening || false,

        isAdmin,

        user:
          req.user,

        success:
          req.query.success === "1",

        error:
          req.query.error || "",

        edit:
          req.query.edit || ""

      }
    );

  } catch (err) {

    console.error(
      "Milk page error:",
      err
    );


    return res
      .status(500)
      .render(
        "milk",
        {

          dairies: [],

          milkRecords: [],

          morningRecords: [],

          eveningRecords: [],

          session: "closed",

          sessionInfo: null,

          canSubmit: false,

          canEditMorning: false,

          canEditEvening: false,

          isAdmin:
            req.user?.role === "admin",

          user:
            req.user,

          success: false,

          error:
            "Error loading milk collection page.",

          edit: ""

        }
      );

  }

};


// ==========================================================
// SUBMIT MILK
// ==========================================================
//
// NORMAL USER SUBMISSION
//
// The service accepts:
//
// [
//   {
//     dairy,
//     liters,
//     remarks
//   }
// ]
//
// The service itself determines the current session,
// current Kenya date and whether submission is open.
//
// ==========================================================

exports.submitMilk = async (
  req,
  res
) => {

  try {

    // ------------------------------------------------------
    // USER CHECK
    // ------------------------------------------------------

    if (
      !req.user ||
      !req.user._id
    ) {

      throw new Error(
        "You must be logged in to record milk."
      );

    }


    // ------------------------------------------------------
    // BUILD RECORDS
    // ------------------------------------------------------

    let records =
      req.body.records;


    /*
     * Support the individual-animal form format:
     *
     * dairy
     * liters
     * remarks
     *
     * This is also compatible with the service's
     * normalized record format.
     */

    if (
      !records &&
      req.body.dairy
    ) {

      records = [

        {

          dairy:
            req.body.dairy,

          liters:
            req.body.liters,

          remarks:
            req.body.remarks || ""

        }

      ];

    }


    // ------------------------------------------------------
    // VALIDATE THAT SOMETHING WAS SUBMITTED
    // ------------------------------------------------------

    if (!records) {

      throw new Error(
        "No milk records were submitted."
      );

    }


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    const saved =
      await milkService.saveMilkRecords(
        records,
        req.user
      );


    // ------------------------------------------------------
    // VERIFY SAVE
    // ------------------------------------------------------

    if (
      !Array.isArray(saved) ||
      !saved.length
    ) {

      throw new Error(
        "The milk records could not be saved."
      );

    }


    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

    return res.redirect(
      "/milk?success=1"
    );

  } catch (err) {

    console.error(
      "Submit milk error:",
      err
    );


    return res.redirect(
      "/milk?error=" +
      encodeURIComponent(
        err.message ||
        "Unable to save milk record."
      )
    );

  }

};


// ==========================================================
// GET EDIT MILK
// ==========================================================
//
// GET /milk/edit/:id
//
// The actual editing is performed through the edit modal
// on the milk page.
//
// This route simply opens the milk page with ?edit=<id>.
//
// ==========================================================

exports.getEditMilk = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    // ------------------------------------------------------
    // VALIDATE ID
    // ------------------------------------------------------

    if (!id) {

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          "Milk record was not specified."
        )
      );

    }


    // ------------------------------------------------------
    // ADMIN ONLY
    // ------------------------------------------------------

    if (
      req.user?.role !== "admin"
    ) {

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          "Only administrators can edit milk records."
        )
      );

    }


    return res.redirect(
      "/milk?edit=" +
      encodeURIComponent(id)
    );

  } catch (err) {

    console.error(
      "Get edit milk error:",
      err
    );


    return res.redirect(
      "/milk?error=" +
      encodeURIComponent(
        err.message ||
        "Unable to open milk record."
      )
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
// The service is responsible for enforcing:
//
// • administrator permission
// • valid record ID
// • same-day restriction
// • morning/evening time restriction
// • valid quantity
//
// ==========================================================

exports.updateMilkRecord = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    // ------------------------------------------------------
    // ADMIN AUTHORIZATION
    // ------------------------------------------------------

    if (
      req.user?.role !== "admin"
    ) {

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          "Only administrators can edit milk records."
        )
      );

    }


    // ------------------------------------------------------
    // VALIDATE ID
    // ------------------------------------------------------

    if (!id) {

      throw new Error(
        "Milk record ID is missing."
      );

    }


    // ------------------------------------------------------
    // VALIDATE QUANTITY
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    const updated =
      await milkService.editMilkRecord({

        recordId:
          id,

        liters:
          numericLiters,

        remarks:
          typeof req.body.remarks === "string"
            ? req.body.remarks
            : "",

        user:
          req.user

      });


    // ------------------------------------------------------
    // VERIFY UPDATE
    // ------------------------------------------------------

    if (!updated) {

      throw new Error(
        "Milk record could not be updated."
      );

    }


    return res.redirect(
      "/milk?success=1"
    );

  } catch (err) {

    console.error(
      "Update milk record error:",
      err
    );


    return res.redirect(
      "/milk?error=" +
      encodeURIComponent(
        err.message ||
        "Unable to update milk record."
      )
    );

  }

};


// ==========================================================
// GET MILK STATS
// ==========================================================
//
// GET /milkStats
//
// Supported:
//
// /milkStats?type=day&date=YYYY-MM-DD
//
// /milkStats?type=month&month=YYYY-MM
//
// ==========================================================

exports.getMilkStats = async (
  req,
  res
) => {

  try {

    const {
      type = "day",
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

          type: "day",

          date:
            selectedDate,

          month:
            "",

          records:
            data?.records || [],

          stats:
            data?.stats || {

              total: 0,

              consumed: 0,

              available: 0,

              price: 50,

              cash: 0,

              locked: false

            },

          sales:
            data?.sales || [],

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

          type: "month",

          date:
            "",

          month:
            selectedMonth,

          records:
            data?.records || [],

          stats:
            data?.stats || {

              total: 0,

              consumed: 0,

              available: 0,

              price: 50,

              cash: 0,

              locked: false,

              avg: 0

            },

          sales:
            data?.sales || [],

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

        type: "",

        date: "",

        month: "",

        records: [],

        stats: {

          total: 0,

          consumed: 0,

          available: 0,

          price: 50,

          cash: 0,

          locked: false,

          avg: 0

        },

        sales: [],

        user:
          req.user

      }
    );

  } catch (err) {

    console.error(
      "Milk stats error:",
      err
    );


    return res
      .status(500)
      .send(
        "Error loading milk statistics."
      );

  }

};


// ==========================================================
// SAVE DAILY STATS
// ==========================================================
//
// POST /milkStats/day
//
// ==========================================================

exports.saveDailyStats = async (
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


    await milkService.saveDailyStats({

      day,

      price

    });


    return res.redirect(
      `/milkStats?type=day&date=${encodeURIComponent(day)}`
    );

  } catch (err) {

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

exports.getSalesPage = async (
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
          data?.standingOrders || [],

        manualSales:
          data?.manualSales || [],

        currentPrice:
          data?.currentPrice ?? 50,

        totalSales:
          data?.totalSales || 0,

        availableMilk:
          data?.availableMilk || 0,

        user:
          req.user

      }
    );

  } catch (err) {

    console.error(
      "Sales page error:",
      err
    );


    return res
      .status(500)
      .send(
        "Error loading sales page."
      );

  }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================
//
// The service currently accepts:
//
// customerName
// liters
//
// ==========================================================

exports.submitManualSale = async (
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

  } catch (err) {

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
// The service currently uses only:
//
// standingOrderId
//
// ==========================================================

exports.submitStandingOrderSale = async (
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

  } catch (err) {

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
// ADMIN ONLY
// ==========================================================

exports.updateMilkPrice = async (
  req,
  res
) => {

  try {

    // ------------------------------------------------------
    // ADMIN CHECK
    // ------------------------------------------------------

    if (
      req.user?.role !== "admin"
    ) {

      return res.redirect(
        "/sales"
      );

    }


    // ------------------------------------------------------
    // VALIDATE PRICE
    // ------------------------------------------------------

    const price =
      Number(
        req.body.price
      );


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      throw new Error(
        "Milk price must be a valid number."
      );

    }


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    await milkService.updateMilkPrice(
      price
    );


    return res.redirect(
      "/sales"
    );

  } catch (err) {

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

exports.addStandingOrder = async (
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

  } catch (err) {

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
// ADMIN ONLY
// ==========================================================

exports.omitStandingOrder = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.body;


    if (!id) {

      throw new Error(
        "Standing order ID is required."
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

  } catch (err) {

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
// Optional:
//
// /milk/history/:dairyId?month=YYYY-MM
//
// ==========================================================

exports.getMilkingHistory = async (
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


    if (!dairyId) {

      throw new Error(
        "Dairy animal ID is required."
      );

    }


    const data =
      await milkService.getMilkingHistory({

        dairyId,

        month

      });


    return res.render(
      "milkingHistory",
      {

        dairy:
          data?.dairy || null,

        records:
          data?.records || [],

        grouped:
          data?.grouped || {},

        monthlyTotal:
          data?.monthlyTotal || 0,

        hasData:
          data?.hasData || false,

        selectedMonth:
          month || "",

        user:
          req.user

      }
    );

  } catch (err) {

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
// ADMIN ONLY
// ==========================================================
//
// POST /milk/history/:id/toggle
//
// ==========================================================

exports.toggleMilkingStatus = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    // ------------------------------------------------------
    // ADMIN CHECK
    // ------------------------------------------------------

    if (
      req.user?.role !== "admin"
    ) {

      return res
        .status(403)
        .send(
          "Only administrators can change milking status."
        );

    }


    if (!id) {

      throw new Error(
        "Dairy animal ID is required."
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

  } catch (err) {

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
// LOCK DAILY SUMMARY
// ADMIN ONLY
// ==========================================================

exports.lockDay = async (
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
          "Only administrators can lock a daily summary."
        );

    }


    const {
      day
    } = req.body;


    if (!day) {

      throw new Error(
        "Day is required."
      );

    }


    await milkService.lockDay(
      day
    );


    return res.redirect(
      `/milkStats?type=day&date=${encodeURIComponent(day)}`
    );

  } catch (err) {

    console.error(
      "Lock day error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to lock daily summary."
      );

  }

};


// ==========================================================
// UNLOCK DAILY SUMMARY
// ADMIN ONLY
// ==========================================================

exports.unlockDay = async (
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
          "Only administrators can unlock a daily summary."
        );

    }


    const {
      day
    } = req.body;


    if (!day) {

      throw new Error(
        "Day is required."
      );

    }


    await milkService.unlockDay(
      day
    );


    return res.redirect(
      `/milkStats?type=day&date=${encodeURIComponent(day)}`
    );

  } catch (err) {

    console.error(
      "Unlock day error:",
      err
    );


    return res
      .status(500)
      .send(
        err.message ||
        "Unable to unlock daily summary."
      );

  }

};


// ==========================================================
// EXPORT SESSION HELPERS
// ==========================================================
//
// These are optional, but keeping them available makes the
// controller compatible with routes or other modules that
// may already use them.
//
// ==========================================================

exports.getMilkSession =
  milkService.getMilkSession;

exports.getKenyaDateParts =
  milkService.getKenyaDateParts;

exports.getSessionDeadline =
  milkService.getSessionDeadline;

exports.canSubmitSession =
  milkService.canSubmitSession;

exports.canAdminEditRecord =
  milkService.canAdminEditRecord;