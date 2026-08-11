const milkService = require("../services/milkService");

// ==================================================
// GET MILK PAGE
// ==================================================

exports.getMilkPage = async (req, res) => {
  try {
    const dairies = await milkService.getMilkingAnimals();

    return res.render("milk", {
      dairies,
      user: req.user,
      success: req.query.success === "1",
    });
  } catch (err) {
    console.error("Milk page error:", err);

    return res.status(500).send("Error loading milk page");
  }
};

// ==================================================
// SUBMIT MILK
// ==================================================

exports.submitMilk = async (req, res) => {
  try {
    await milkService.saveMilkRecords(
      req.body.records,
      req.user?._id
    );

    return res.redirect("/milk?success=1");
  } catch (err) {
    console.error("Submit milk error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// GET EDIT MILK RECORD
// ==================================================

exports.getEditMilk = async (req, res) => {
  try {
    const { id } = req.params;

    const data =
      await milkService.getMilkRecordForEdit({
        recordId: id,
        user: req.user,
      });

    return res.render("milkEdit", {
      record: data.record,
      canEdit: data.canEdit,
      message: data.message || "",
      user: req.user,
    });

  } catch (err) {
    console.error("Get edit milk error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// UPDATE MILK RECORD
// ==================================================

exports.updateMilkRecord = async (req, res) => {
  try {
    const { id } = req.params;

    await milkService.updateMilkRecord({
      recordId: id,
      liters: req.body.liters,
      remarks: req.body.remarks,
      user: req.user,
    });

    return res.redirect("/milk?success=1");

  } catch (err) {
    console.error("Update milk record error:", err);

    return res.status(403).send(err.message);
  }
};

// ==================================================
// GET MILK STATS
// ==================================================

exports.getMilkStats = async (req, res) => {
  try {
    const {
      type = "day",
      date,
      month,
    } = req.query;

    // ==================================================
    // DAILY REPORT
    // ==================================================

    if (type === "day") {
      const selectedDate =
        date ||
        new Date().toISOString().split("T")[0];

      const data =
        await milkService.getDailyStats(selectedDate);

      return res.render("milkStats", {
        type,
        date: selectedDate,
        month: "",
        records: data.records || [],
        stats: data.stats || {},
        sales: data.sales || [],
        user: req.user,
      });
    }

    // ==================================================
    // MONTHLY REPORT
    // ==================================================

    if (type === "month") {
      const selectedMonth =
        month ||
        new Date().toISOString().slice(0, 7);

      const data =
        await milkService.getMonthlyStats(selectedMonth);

      return res.render("milkStats", {
        type,
        date: "",
        month: selectedMonth,
        records: data.records || [],
        stats: data.stats || {},
        sales: data.sales || [],
        user: req.user,
      });
    }

    // ==================================================
    // FALLBACK
    // ==================================================

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
        avg: 0,
      },
      sales: [],
      user: req.user,
    });

  } catch (err) {
    console.error("Milk stats error:", err);

    return res.status(500).send("Error loading stats");
  }
};

// ==================================================
// SAVE DAILY STATS
// ==================================================

exports.saveDailyStats = async (req, res) => {
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
      `/stats?type=day&date=${day}`
    );

  } catch (err) {
    console.error(
      "Save daily stats error:",
      err
    );

    return res
      .status(500)
      .send(err.message);
  }
};

// ==================================================
// GET SALES PAGE
// ==================================================

exports.getSalesPage = async (req, res) => {
  try {
    const data =
      await milkService.getSalesPageData();

    return res.render("sales", {
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
    });

  } catch (err) {
    console.error(
      "Sales page error:",
      err
    );

    return res
      .status(500)
      .send("Error loading sales page");
  }
};

// ==================================================
// SUBMIT MANUAL SALE
// ==================================================

exports.submitManualSale = async (req, res) => {
  try {
    await milkService.submitManualSale({
      customerName: req.body.customerName,
      liters: req.body.liters,
      user: req.user,
    });

    return res.redirect("/sales");

  } catch (err) {
    console.error("Manual sale error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// SUBMIT STANDING ORDER SALE
// ==================================================

exports.submitStandingOrderSale = async (req, res) => {
  try {
    await milkService.submitStandingOrderSale({
      standingOrderId: req.body.standingOrderId,
      customerName: req.body.customerName,
      liters: req.body.liters,
      user: req.user,
    });

    return res.redirect("/sales");

  } catch (err) {
    console.error("Standing sale error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// UPDATE MILK PRICE
// ==================================================

exports.updateMilkPrice = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.redirect("/sales");
    }

    await milkService.updateMilkPrice(
      Number(req.body.price)
    );

    return res.redirect("/sales");

  } catch (err) {
    console.error("Price update error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// ADD STANDING ORDER
// ==================================================

exports.addStandingOrder = async (req, res) => {
  try {
    const {
      customerName,
      liters,
    } = req.body;

    await milkService.addStandingOrder({
      customerName,
      liters,
    });

    return res.redirect("/sales");

  } catch (err) {
    console.error("Add standing order error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// OMIT STANDING ORDER
// ==================================================

exports.omitStandingOrder = async (req, res) => {
  try {
    const { id } = req.body;

    await milkService.omitStandingOrder({
      orderId: id,
      user: req.user,
    });

    return res.redirect("/sales");

  } catch (err) {
    console.error("Omit standing order error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// MILKING HISTORY
// ==================================================

exports.getMilkingHistory = async (req, res) => {
  try {
    const { dairyId } = req.params;
    const { month } = req.query;

    const data =
      await milkService.getMilkingHistory({
        dairyId,
        month,
      });

    return res.render("milkingHistory", {
      dairy: data.dairy,
      records: data.records || [],
      grouped: data.grouped || {},
      monthlyTotal: data.monthlyTotal || 0,
      hasData: data.hasData || false,
      selectedMonth: month || "",
      user: req.user,
    });

  } catch (err) {
    console.error("Milking history error:", err);

    return res.status(500).send(err.message);
  }
};

// ==================================================
// TOGGLE MILKING STATUS
// ==================================================

exports.toggleMilkingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    await milkService.toggleMilkingStatus({
      dairyId: id,
      user: req.user,
    });

    return res.redirect(`/milk/history/${id}`);

  } catch (err) {
    console.error("Toggle milking status error:", err);

    return res.status(500).send(err.message);
  }
};