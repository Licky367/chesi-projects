// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService =
  require("../services/milkService");


// ==========================================================
// INTERNAL HELPERS
// ==========================================================
//
// These helpers normalize the data coming from milkService
// into the exact structure expected by milk.ejs:
//
// [
//     {
//         farm: <Dairy Farm>,
//         animals: [ <Dairy Animal>, ... ]
//     }
// ]
//
// The Milk page should therefore never have to guess whether
// `dairies` contains farms or individual animals.
// ==========================================================


// ==========================================================
// GET FARM ANIMALS
// ==========================================================

function getFarmAnimals(farm) {

  if (!farm) {
    return [];
  }


  /*
   * Preferred property.
   */

  if (
    Array.isArray(farm.animals)
  ) {

    return farm.animals;

  }


  /*
   * Compatibility with possible existing property names.
   */

  if (
    Array.isArray(farm.dairyAnimals)
  ) {

    return farm.dairyAnimals;

  }


  if (
    Array.isArray(farm.assets)
  ) {

    return farm.assets;

  }


  if (
    Array.isArray(farm.properties)
  ) {

    return farm.properties;

  }


  /*
   * No animal array found.
   */

  return [];

}


// ==========================================================
// CHECK WHETHER ANIMAL IS CURRENTLY MILKING
// ==========================================================
//
// Your current EJS requires:
//
//     isMilking === true
//
// We therefore normalize the check here.
//
// If your Dairy model uses another definitive field later,
// this is the one helper that needs changing.
// ==========================================================

function isCurrentlyMilking(animal) {

  if (!animal) {
    return false;
  }


  /*
   * Primary field.
   */

  if (
    animal.isMilking === true
  ) {

    return true;

  }


  /*
   * Compatibility with boolean-like values.
   */

  if (
    animal.isMilking === "true"
  ) {

    return true;

  }


  /*
   * Some Mongoose documents may expose the value
   * through a getter.
   */

  if (
    Boolean(animal.isMilking) === true
  ) {

    return true;

  }


  return false;

}


// ==========================================================
// NORMALIZE MILK FARM TABLES
// ==========================================================
//
// Input:
//
//     data.dairies
//
// Expected input:
//
//     [
//         farm,
//         farm,
//         farm
//     ]
//
// Output:
//
//     [
//         {
//             farm,
//             animals
//         }
//     ]
//
// Only animals currently participating in milk collection
// are included.
// ==========================================================

function buildMilkDairyTables(dairies) {

  if (
    !Array.isArray(dairies)
  ) {

    return [];

  }


  const tables = [];


  dairies.forEach(function (farm) {

    if (!farm) {
      return;
    }


    const farmAnimals =
      getFarmAnimals(farm);


    /*
     * Only animals currently being milked.
     */

    const milkingAnimals =
      farmAnimals.filter(
        isCurrentlyMilking
      );


    /*
     * Do not create an empty farm table.
     */

    if (
      milkingAnimals.length === 0
    ) {

      return;

    }


    /*
     * Keep the farm document intact.
     *
     * This allows milk.ejs to access:
     *
     *     farm._id
     *     farm.name
     *     farm.code
     */

    tables.push({

      farm:

        farm,

      animals:

        milkingAnimals

    });

  });


  return tables;

}


// ==========================================================
// GET MILK PAGE
// ==========================================================
//
// SYSTEM RULE:
//
// ADMIN
// ----------------------------------------------------------
// Receives all Dairy Farms and all currently milking animals
// belonging to those farms.
//
// DAIRY WORKER
// ----------------------------------------------------------
// Receives ONLY the Dairy Farm currently selected/switched
// to by that worker.
//
// The service remains responsible for determining which farms
// the user is allowed to see.
//
// The controller is responsible for transforming the returned
// farms into the structure expected by milk.ejs.
// ==========================================================

exports.getMilkPage = async (req, res) => {

  try {

    // ------------------------------------------------------
    // AUTHENTICATED USER
    // ------------------------------------------------------

    const user =
      req.user ||
      req.session?.user ||
      null;


    // ------------------------------------------------------
    // GET MILK PAGE DATA
    // ------------------------------------------------------

    const data =
      await milkService.getMilkPageData(
        user
      );


    // ------------------------------------------------------
    // CURRENT SESSION
    // ------------------------------------------------------

    const currentSession =
      data?.session ||
      "closed";


    // ------------------------------------------------------
    // ADMIN STATUS
    // ------------------------------------------------------

    const isAdmin =
      user?.role === "admin";


    // ------------------------------------------------------
    // RAW FARMS FROM SERVICE
    // ------------------------------------------------------

    const rawDairies =
      Array.isArray(data?.dairies)
        ? data.dairies
        : [];


    // ------------------------------------------------------
    // BUILD MILK TABLE DATA
    // ------------------------------------------------------
    //
    // This is the important part.
    //
    // milk.ejs expects:
    //
    // milkDairyTables = [
    //
    //     {
    //         farm: farm,
    //         animals: [...]
    //     }
    //
    // ]
    //
    // ------------------------------------------------------

    const milkDairyTables =
      buildMilkDairyTables(
        rawDairies
      );


    // ------------------------------------------------------
    // CURRENT FARM
    // ------------------------------------------------------
    //
    // The service may already provide the currently selected
    // farm. We expose both names because milk.ejs supports
    // both `currentDairy` and `currentFarm`.
    // ------------------------------------------------------

    const activeFarm =
      data?.currentDairy ||
      data?.currentFarm ||
      data?.activeFarm ||
      null;


    // ------------------------------------------------------
    // RENDER MILK PAGE
    // ------------------------------------------------------

    return res.render(
      "milk",
      {

        /*
         * PRIMARY VARIABLE USED BY THE NEW MILK EJS.
         */

        milkDairyTables:
          milkDairyTables,


        /*
         * Keep `dairies` available for compatibility with
         * any other code that may still reference it.
         */

        dairies:
          rawDairies,


        /*
         * Current selected Dairy Farm.
         */

        currentDairy:
          activeFarm,


        currentFarm:
          activeFarm,


        /*
         * Current collection session.
         */

        session:
          currentSession,


        /*
         * Administrator status.
         */

        isAdmin:
          isAdmin,


        /*
         * Logged-in user.
         */

        user:
          user,


        /*
         * Success message.
         */

        success:
          req.query.success === "1",


        /*
         * Error message.
         */

        error:
          req.query.error || ""

      }
    );

  } catch (err) {

    console.error(
      "Milk page error:",
      err
    );


    const user =
      req.user ||
      req.session?.user ||
      null;


    return res
      .status(500)
      .render(
        "milk",
        {

          /*
           * Always provide the exact structure expected
           * by milk.ejs, even when loading fails.
           */

          milkDairyTables:
            [],


          dairies:
            [],


          currentDairy:
            null,


          currentFarm:
            null,


          session:
            "closed",


          isAdmin:
            user?.role === "admin",


          user:
            user,


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
// Used when an individual animal's milk record is submitted.
//
// Form:
//
//     dairy
//     session
//     liters
//     remarks
//
// IMPORTANT:
//
// The service must verify that the submitted animal belongs
// to a farm the current user is allowed to work with.
// ==========================================================

exports.submitMilk = async (req, res) => {

  try {

    const {

      dairy,
      session,
      liters,
      remarks

    } = req.body;


    const user =
      req.user ||
      req.session?.user ||
      null;


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


    // ------------------------------------------------------
    // SERVICE AUTHORIZATION
    // ------------------------------------------------------

    await milkService.saveMilkRecords(
      records,
      user
    );


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
// Compatibility endpoint.
// ==========================================================

exports.getEditMilk = async (
  req,
  res
) => {

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


    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

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


      return res.render(
        "milkStats",
        {

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

        }
      );

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


      return res.render(
        "milkStats",
        {

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


// ==========================================================
// SAVE DAILY STATS
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
        "Error loading sales page"
      );

  }

};


// ==========================================================
// SUBMIT MANUAL SALE
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
// ==========================================================
// ADMIN ONLY
// ==========================================================

exports.updateMilkPrice = async (
  req,
  res
) => {

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