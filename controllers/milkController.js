const milkService =
  require("../services/milkService");


// ==================================================
// GET MILK PAGE
// ==================================================

exports.getMilkPage = async (req, res) => {

  try {

    const data =
      await milkService.getMilkPageData();

    /*
     * The service returns:
     *
     * session: {
     *   name: "morning" | "evening"
     * }
     *
     * or:
     *
     * session: {
     *   name: null
     * }
     *
     * The EJS expects:
     *
     * "morning"
     * "closed"
     * "evening"
     */

    const currentSession =
      data.session?.name ||
      "closed";


    const isAdmin =
      req.user?.role === "admin";


    return res.render(
      "milk",
      {

        dairies:
          data.dairies || [],

        session:
          currentSession,

        isAdmin,

        user:
          req.user,

        success:
          req.query.success === "1",

        error:
          req.query.error || ""

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


// ==================================================
// SUBMIT MILK
// ==================================================

exports.submitMilk = async (
  req,
  res
) => {

  try {

    /*
     * IMPORTANT:
     *
     * saveMilkRecords() expects the
     * complete user object because it
     * uses user._id.
     */

    await milkService.saveMilkRecords(
      req.body.records,
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


    /*
     * Business-rule errors should return
     * the user to the milk page rather
     * than exposing a raw 500 page.
     */

    const message =
      err.message ||
      "Unable to save milk records.";


    return res.redirect(
      "/milk?error=" +
      encodeURIComponent(message)
    );

  }

};


// ==================================================
// GET EDIT MILK RECORD
//
// This route exists because the router
// requires it.
//
// The actual edit form is displayed
// through the modal on milk.ejs.
// ==================================================

exports.getEditMilk = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    /*
     * The normal milk page already contains
     * the edit modal and submits directly to:
     *
     * POST /milk/edit/:id
     *
     * Therefore this GET route is retained
     * for router compatibility.
     *
     * Redirecting to /milk keeps the edit UI
     * in one place and does not interfere
     * with the other milk pages.
     */

    return res.redirect(
      `/milk?edit=${encodeURIComponent(id)}`
    );

  } catch (err) {

    console.error(
      "Get edit milk error:",
      err
    );

    return res
      .status(500)
      .send(
        err.message ||
        "Unable to open milk record."
      );

  }

};


// ==================================================
// UPDATE MILK RECORD
// ADMIN ONLY
// ==================================================

exports.updateMilkRecord = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params;


    /*
     * editMilkRecord() performs the
     * administrator authorization and
     * milk-session validation.
     *
     * Pass the complete req.user object.
     */

    await milkService.editMilkRecord({

      recordId:
        id,

      liters:
        req.body.liters,

      remarks:
        req.body.remarks,

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


    /*
     * Return the administrator to the
     * milk page with the actual business
     * rule error.
     */

    return res.redirect(
      "/milk?error=" +
      encodeURIComponent(
        err.message ||
        "Unable to update milk record."
      )
    );

  }

};


// ==================================================
// GET MILK STATS
// ==================================================

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


    // ==================================================
    // DAILY REPORT
    // ==================================================

    if (
      type === "day"
    ) {

      const selectedDate =
        date ||
        new Date()
          .toISOString()
          .split("T")[0];


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
            data.records || [],

          stats:
            data.stats || {},

          sales:
            data.sales || [],

          user:
            req.user

        }
      );

    }


    // ==================================================
    // MONTHLY REPORT
    // ==================================================

    if (
      type === "month"
    ) {

      const selectedMonth =
        month ||
        new Date()
          .toISOString()
          .slice(0, 7);


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
            data.records || [],

          stats:
            data.stats || {},

          sales:
            data.sales || [],

          user:
            req.user

        }
      );

    }


    // ==================================================
    // FALLBACK
    // ==================================================

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


// ==================================================
// SAVE DAILY STATS
// ==================================================

exports.saveDailyStats = async (
  req,
  res
) => {

  try {

    const {
      day,
      price
    } = req.body;


    await milkService.saveDailyStats({

      day,

      price

    });


    return res.redirect(
      `/stats?type=day&date=${encodeURIComponent(day)}`
    );

  } catch (err) {

    console.error(
      "Save daily stats error:",
      err
    );

    return res
      .status(500)
      .send(
        err.message
      );

  }

};


// ==================================================
// GET SALES PAGE
// ==================================================

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
          data.standingOrders || [],

        manualSales:
          data.manualSales || [],

        currentPrice:
          data.currentPrice ?? 50,

        totalSales:
          data.totalSales || 0,

        availableMilk:
          data.availableMilk || 0,

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
        "Error loading sales page"
      );

  }

};


// ==================================================
// SUBMIT MANUAL SALE
// ==================================================

exports.submitManualSale = async (
  req,
  res
) => {

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
        err.message
      );

  }

};


// ==================================================
// SUBMIT STANDING ORDER SALE
// ==================================================

exports.submitStandingOrderSale =
  async (
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
          err.message
        );

    }

  };


// ==================================================
// UPDATE MILK PRICE
// ==================================================

exports.updateMilkPrice = async (
  req,
  res
) => {

  try {

    /*
     * Keep authorization here as well as
     * in the service.
     */

    if (
      req.user?.role !==
      "admin"
    ) {

      return res.redirect(
        "/sales"
      );

    }


    await milkService.updateMilkPrice(
      Number(
        req.body.price
      )
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
        err.message
      );

  }

};


// ==================================================
// ADD STANDING ORDER
// ==================================================

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
        err.message
      );

  }

};


// ==================================================
// OMIT STANDING ORDER
// ==================================================

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
        err.message
      );

  }

};


// ==================================================
// MILKING HISTORY
// ==================================================

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
          data.dairy,

        records:
          data.records || [],

        grouped:
          data.grouped || {},

        monthlyTotal:
          data.monthlyTotal || 0,

        hasData:
          data.hasData || false,

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
        err.message
      );

  }

};


// ==================================================
// TOGGLE MILKING STATUS
// ==================================================

exports.toggleMilkingStatus =
  async (
    req,
    res
  ) => {

    try {

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

    } catch (err) {

      console.error(
        "Toggle milking status error:",
        err
      );

      return res
        .status(500)
        .send(
          err.message
        );

    }

  };