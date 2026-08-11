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
     * milkService.getMilkPageData() returns:
     *
     * session:
     *   "morning"
     *   "closed"
     *   "evening"
     *
     * Do NOT use data.session.name because
     * session is already a string.
     */

    const currentSession =
      data.session ||
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
     * saveMilkRecords() expects:
     *
     * 1. records
     * 2. complete user object
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
// GET EDIT MILK
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
     * The actual edit form is handled by
     * the modal on milk.ejs.
     *
     * Keep this route for compatibility.
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


    /*
     * Keep the existing stats route behavior.
     *
     * This avoids changing routing for other pages.
     */

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
     * Keep the controller authorization.
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