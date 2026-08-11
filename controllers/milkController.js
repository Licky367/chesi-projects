// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService = require("../services/milkService");


// ==========================================================
// GET MILK PAGE
// ==========================================================

exports.getMilkPage = async (req, res) => {

  try {

    const data =
      await milkService.getMilkPageData();


    const currentSession =
      data?.session || "closed";


    const isAdmin =
      req.user?.role === "admin";


    return res.render("milk", {

      dairies:
        data?.dairies || [],

      session:
        currentSession,

      isAdmin,

      user:
        req.user,

      success:
        req.query.success === "1",

      error:
        req.query.error || ""

    });

  } catch (err) {

    console.error(
      "Milk page error:",
      err
    );


    return res
      .status(500)
      .render("milk", {

        dairies: [],

        session: "closed",

        isAdmin:
          req.user?.role === "admin",

        user:
          req.user,

        success: false,

        error:
          "Error loading milk collection page."

      });

  }

};


// ==========================================================
// SUBMIT MILK
// ==========================================================
//
// Used when an individual animal's milk record is submitted.
//
// The milk.ejs page creates a separate form for each animal:
//
//     dairy
//     session
//     liters
//     remarks
//
// ==========================================================

exports.submitMilk = async (req, res) => {

  try {

    const {

      dairy,
      session,
      liters,
      remarks

    } = req.body;


    // ------------------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------------------

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
      !Number.isFinite(numericLiters) ||
      numericLiters < 0
    ) {

      throw new Error(
        "Milk quantity must be a valid number."
      );

    }


    // ------------------------------------------------------
    // SESSION VALIDATION
    // ------------------------------------------------------

    if (
      session !== "morning" &&
      session !== "evening"
    ) {

      throw new Error(
        "Invalid milk collection session."
      );

    }


    // ------------------------------------------------------
    // SAVE ONE RECORD
    // ------------------------------------------------------
    //
    // saveMilkRecords() supports the records format used
    // throughout the milk module.
    //
    // We convert the individual form submission into one
    // record here.
    //
    // ------------------------------------------------------

    const records = [

      {
        dairy,

        liters:
          numericLiters,

        remarks:
          remarks || "",

        session

      }

    ];


    await milkService.saveMilkRecords(
      records,
      req.user
    );


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
// Kept for compatibility with any existing link such as:
//
//     /milk/edit/:id
//
// The actual page editing is performed by the modal on
// milk.ejs, so this route simply sends the user back to
// the milk page with the record ID.
//
// ==========================================================

exports.getEditMilk = async (req, res) => {

  try {

    const {
      id
    } = req.params;


    if (!id) {

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          "Milk record was not specified."
        )
      );

    }


    // ------------------------------------------------------
    // ONLY ADMIN CAN EDIT
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
// ADMIN ONLY
// ==========================================================
//
// POST /milk/:id
//
// This is the endpoint used by the edit modal.
//
// ==========================================================

exports.updateMilkRecord = async (req, res) => {

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
    // VALIDATE RECORD ID
    // ------------------------------------------------------

    if (!id) {

      throw new Error(
        "Milk record ID is missing."
      );

    }


    // ------------------------------------------------------
    // VALIDATE LITRES
    // ------------------------------------------------------

    const numericLiters =
      Number(req.body.liters);


    if (
      !Number.isFinite(numericLiters) ||
      numericLiters < 0
    ) {

      throw new Error(
        "Milk quantity must be a valid number."
      );

    }


    // ------------------------------------------------------
    // UPDATE RECORD
    // ------------------------------------------------------

    await milkService.editMilkRecord({

      recordId:
        id,

      liters:
        numericLiters,

      remarks:
        req.body.remarks || "",

      user:
        req.user

    });


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

exports.getMilkStats = async (req, res) => {

  try {

    const {
      type = "day",
      date,
      month
    } = req.query;


    // ======================================================
    // DAILY REPORT
    // ======================================================

    if (type === "day") {

      const selectedDate =
        date ||
        new Date()
          .toISOString()
          .split("T")[0];


      const data =
        await milkService.getDailyStats(
          selectedDate
        );


      return res.render("milkStats", {

        type,

        date:
          selectedDate,

        month:
          "",

        records:
          data?.records || [],

        stats:
          data?.stats || {},

        sales:
          data?.sales || [],

        user:
          req.user

      });

    }


    // ======================================================
    // MONTHLY REPORT
    // ======================================================

    if (type === "month") {

      const selectedMonth =
        month ||
        new Date()
          .toISOString()
          .slice(0, 7);


      const data =
        await milkService.getMonthlyStats(
          selectedMonth
        );


      return res.render("milkStats", {

        type,

        date:
          "",

        month:
          selectedMonth,

        records:
          data?.records || [],

        stats:
          data?.stats || {},

        sales:
          data?.sales || [],

        user:
          req.user

      });

    }


    // ======================================================
    // INVALID TYPE
    // ======================================================

    return res.render("milkStats", {

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
        req.user

    });

  } catch (err) {

    console.error(
      "Milk stats error:",
      err
    );


    return res
      .status(500)
      .send(
        "Error loading stats"
      );

  }

};


// ==========================================================
// SAVE DAILY STATS
// ==========================================================

exports.saveDailyStats = async (req, res) => {

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


    // ------------------------------------------------------
    // IMPORTANT:
    //
    // The milk stats page is /milkStats, not /stats.
    // ------------------------------------------------------

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

exports.getSalesPage = async (req, res) => {

  try {

    const data =
      await milkService.getSalesPageData();


    return res.render("sales", {

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

    });

  } catch (err) {

    console.error(
      "Sales page error:",
      err
    );


    return res
      .status(500)
      .send(
        "Error loading sales page"
      );

  }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================

exports.submitManualSale = async (req, res) => {

  try {

    await milkService.submitManualSale({

      customerName:
        req.body.customerName,

      liters:
        req.body.liters,

      user:
        req.user

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

exports.submitStandingOrderSale = async (
  req,
  res
) => {

  try {

    await milkService.submitStandingOrderSale({

      standingOrderId:
        req.body.standingOrderId,

      customerName:
        req.body.customerName,

      liters:
        req.body.liters,

      user:
        req.user

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

exports.updateMilkPrice = async (req, res) => {

  try {

    if (
      req.user?.role !== "admin"
    ) {

      return res.redirect(
        "/sales"
      );

    }


    const price =
      Number(req.body.price);


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
// ==========================================================

exports.omitStandingOrder = async (
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


    const data =
      await milkService.getMilkingHistory({

        dairyId,

        month

      });


    return res.render(
      "milkingHistory",
      {

        dairy:
          data?.dairy,

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

exports.toggleMilkingStatus = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    if (
      req.user?.role !== "admin"
    ) {

      return res
        .status(403)
        .send(
          "Only administrators can change milking status."
        );

    }


    await milkService.toggleMilkingStatus({

      dairyId:
        id,

      user:
        req.user

    });


    return res.redirect(
      `/milk/history/${id}`
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