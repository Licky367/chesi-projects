const milkService =
  require("../services/milkService");


// ==================================================
// GET MILK PAGE
// ==================================================

exports.getMilkPage = async (
  req,
  res
) => {

  try {

    const data =
      await milkService.getMilkPageData();

    const currentSession =
      data.session ||
      "closed";

    const isAdmin =
      req.user?.role === "admin";


    /*
     * ------------------------------------------------
     * EDIT REQUEST
     * ------------------------------------------------
     *
     * If the page was opened with:
     *
     * /milk?edit=RECORD_ID
     *
     * the EJS can use editRecord to open/populate
     * the edit interface.
     */

    let editRecord =
      null;

    if (
      req.query.edit &&
      isAdmin
    ) {

      try {

        editRecord =
          await milkService.getMilkRecord(
            req.query.edit
          );

      } catch (editError) {

        console.error(
          "Load milk edit record error:",
          editError
        );

      }

    }


    return res.render(
      "milk",
      {

        /*
         * All animals with their morning/evening
         * records attached.
         */

        dairies:
          data.dairies || [],


        /*
         * Current session:
         *
         * morning
         * closed
         * evening
         */

        session:
          currentSession,


        /*
         * Permission information.
         */

        isAdmin,


        canSubmit:
          data.canSubmit === true,

        canEditMorning:
          data.canEditMorning === true,

        canEditEvening:
          data.canEditEvening === true,


        /*
         * Existing records.
         */

        milkRecords:
          data.milkRecords || [],

        morningRecords:
          data.morningRecords || [],

        eveningRecords:
          data.eveningRecords || [],


        /*
         * Record selected for editing.
         */

        editRecord,


        /*
         * Logged-in user.
         */

        user:
          req.user,


        /*
         * Flash-style query messages.
         */

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

          dairies:
            [],

          session:
            "closed",

          isAdmin:
            req.user?.role === "admin",

          canSubmit:
            false,

          canEditMorning:
            false,

          canEditEvening:
            false,

          milkRecords:
            [],

          morningRecords:
            [],

          eveningRecords:
            [],

          editRecord:
            null,

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
//
// NORMAL COLLECTION SUBMISSION
// ==================================================

exports.submitMilk = async (
  req,
  res
) => {

  try {

    /*
     * ------------------------------------------------
     * SAVE RECORDS
     * ------------------------------------------------
     */

    const savedRecords =
      await milkService.saveMilkRecords(
        req.body.records,
        req.user
      );


    /*
     * ------------------------------------------------
     * IMPORTANT
     * ------------------------------------------------
     *
     * Never report success if nothing was saved.
     *
     * This prevents:
     *
     * "Record successfully saved"
     *
     * when the service actually inserted zero
     * records.
     */

    if (
      !Array.isArray(savedRecords) ||
      savedRecords.length === 0
    ) {

      throw new Error(
        "No milk records were saved. Please enter a valid milk quantity before saving."
      );

    }


    /*
     * At least one record was successfully
     * inserted into MongoDB.
     */

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
      encodeURIComponent(
        message
      )
    );

  }

};


// ==================================================
// GET EDIT MILK
//
// RETURNS THE ACTUAL RECORD
//
// This endpoint is intended for the EJS edit
// button/modal to call using fetch().
//
// ADMIN ONLY.
// ==================================================

exports.getEditMilk = async (
  req,
  res
) => {

  try {

    /*
     * ------------------------------------------------
     * ADMIN CHECK
     * ------------------------------------------------
     */

    if (
      req.user?.role !==
      "admin"
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          error:
            "Only an administrator can edit milk records."

        });

    }


    const {
      id
    } = req.params;


    if (
      !id
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          error:
            "Milk record ID is required."

        });

    }


    /*
     * ------------------------------------------------
     * GET RECORD
     * ------------------------------------------------
     */

    const record =
      await milkService.getMilkRecord(
        id
      );


    if (
      !record
    ) {

      return res
        .status(404)
        .json({

          success:
            false,

          error:
            "Milk record not found."

        });

    }


    /*
     * ------------------------------------------------
     * RETURN RECORD TO EJS
     * ------------------------------------------------
     *
     * The frontend can now use:
     *
     * record._id
     * record.dairy
     * record.liters
     * record.remarks
     * record.session
     * record.day
     *
     */

    return res.json({

      success:
        true,

      record

    });

  } catch (err) {

    console.error(
      "Get edit milk error:",
      err
    );

    return res
      .status(
        err.code ===
          "MILK_NOT_FOUND"
          ? 404
          : 500
      )
      .json({

        success:
          false,

        error:
          err.message ||
          "Unable to load milk record."

      });

  }

};


// ==================================================
// UPDATE MILK RECORD
//
// ADMIN ONLY
// ==================================================

exports.updateMilkRecord = async (
  req,
  res
) => {

  try {

    /*
     * ------------------------------------------------
     * ADMIN CHECK
     * ------------------------------------------------
     *
     * The service also checks this.
     * Keeping it here prevents unnecessary database
     * work and makes the controller secure as well.
     */

    if (
      req.user?.role !==
      "admin"
    ) {

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          "Only an administrator can edit milk records."
        )
      );

    }


    const {
      id
    } = req.params;


    /*
     * ------------------------------------------------
     * UPDATE
     * ------------------------------------------------
     */

    const updatedRecord =
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


    /*
     * Make sure the service actually returned
     * the updated document.
     */

    if (
      !updatedRecord
    ) {

      throw new Error(
        "Milk record was not updated."
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
        err.message ||
        "Unable to save daily statistics."
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
        err.message ||
        "Unable to record sale."
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
          err.message ||
          "Unable to process standing order."
        );

    }

  };


// ==================================================
// UPDATE MILK PRICE
// ADMIN ONLY
// ==================================================

exports.updateMilkPrice = async (
  req,
  res
) => {

  try {

    if (
      req.user?.role !==
      "admin"
    ) {

      return res.redirect(
        "/sales"
      );

    }


    const price =
      Number(
        req.body.price
      );


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      throw new Error(
        "Invalid milk price."
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
        err.message ||
        "Unable to add standing order."
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
        err.message ||
        "Unable to omit standing order."
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
        err.message ||
        "Unable to load milking history."
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
          err.message ||
          "Unable to change milking status."
        );

    }

  };