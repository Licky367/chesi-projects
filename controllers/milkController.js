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
// ==========================================================


const mongoose =
  require("mongoose");

const milkService =
  require("../services/milkService");

const Dairy =
  require("../models/dairy");


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
// IMPORTANT
// ----------------------------------------------------------
// milk.ejs is organized by Dairy Farm.
//
// Each table represents ONE Dairy Farm.
//
// Example:
//
//     Green Farm
//     Farm Code: -1
//
//     ---------------------------------------------------
//     Animal       Morning       Evening
//     Cow 1        10L           12L
//     Cow 2         8L            9L
//
//     Blue Farm
//     Farm Code: -3
//
//     ---------------------------------------------------
//     Animal       Morning       Evening
//     Cow 3        15L           14L
//
// ----------------------------------------------------------
//
// Animal grouping:
//
//     animal.assetCode === dairyFarm.code
//
// Example:
//
//     Dairy Farm:
//         code = -5
//
//     Animals:
//         assetCode = -5
//
// Therefore all animals with assetCode -5 belong to
// the Dairy Farm whose code is -5.
//
// ACCESS
// ----------------------------------------------------------
//
// ADMIN
//     Sees every Dairy Farm.
//
// DAIRY WORKER
//     Sees only Dairy Farms contained in:
//
//         req.user.assignedFarm
//
// assignedFarm contains Dairy document ObjectIds.
//
// ==========================================================

exports.getMilkPage =
async (
  req,
  res
) => {

  try {

    // ======================================================
    // GET DATA FROM SERVICE
    // ======================================================
    //
    // The milk service remains responsible for preparing
    // the actual milk collection information.
    //
    // ======================================================

    const data =
      await milkService.getMilkPageData(
        req.user
      );


    const currentSession =
      data?.session ||
      "closed";


    const isAdmin =
      req.user?.role === "admin";


    // ======================================================
    // RAW DAIRY DATA FROM SERVICE
    // ======================================================

    const serviceDairies =
      Array.isArray(
        data?.dairies
      )

        ? data.dairies

        : [];


    // ======================================================
    // GET DAIRY FARMS
    // ======================================================
    //
    // Dairy farms are identified by:
    //
    //     code < 0
    //
    // We fetch the farms independently so that the controller
    // can guarantee that every milk table has the correct
    // parent Dairy Farm name.
    //
    // ======================================================

    let farmQuery = {

      code: {
        $lt: 0
      },

      status: "active"

    };


    // ======================================================
    // WORKER FARM RESTRICTION
    // ======================================================
    //
    // A dairyWorker may only see farms assigned to them.
    //
    // assignedFarm contains Dairy document ObjectIds.
    //
    // ======================================================

    if (!isAdmin) {

      const assignedFarmIds =
        Array.isArray(
          req.user?.assignedFarm
        )

          ? req.user.assignedFarm

          : [];


      // ----------------------------------------------------
      // Worker with no assigned farms
      // ----------------------------------------------------

      if (
        assignedFarmIds.length === 0
      ) {

        return res.render(
          "milk",
          {

            farms:
              [],

            dairies:
              [],

            session:
              currentSession,

            isAdmin,

            user:
              req.user,

            success:
              req.query.success === "1",

            error:
              req.query.error ||
              ""

          }
        );

      }


      farmQuery._id = {

        $in:
          assignedFarmIds

      };

    }


    // ======================================================
    // LOAD FARMS
    // ======================================================

    const farms =
      await Dairy
        .find(
          farmQuery
        )
        .sort({
          code: 1
        })
        .lean();


    // ======================================================
    // MAP FARMS BY CODE
    // ======================================================
    //
    // The important relationship is:
    //
    //     farm.code
    //
    //             =
    //
    //     animal.assetCode
    //
    // ======================================================

    const farmByCode =
      new Map();


    for (
      const farm
      of farms
    ) {

      farmByCode.set(

        Number(
          farm.code
        ),

        farm

      );

    }


    // ======================================================
    // PREPARE ANIMALS
    // ======================================================
    //
    // Only identified animals are relevant to milk
    // collection.
    //
    // Animals have:
    //
    //     code > 0
    //
    // and must have:
    //
    //     assetCode < 0
    //
    // ======================================================

    const animals =
      serviceDairies.filter(
        animal => {

          const code =
            Number(
              animal?.code
            );


          const assetCode =
            Number(
              animal?.assetCode
            );


          return (

            Number.isFinite(code) &&

            code > 0 &&

            Number.isFinite(assetCode) &&

            assetCode < 0

          );

        }
      );


    // ======================================================
    // GROUP ANIMALS BY FARM
    // ======================================================
    //
    // Each farm gets its own table.
    //
    // ======================================================

    const animalsByFarm =
      new Map();


    for (
      const animal
      of animals
    ) {

      const assetCode =
        Number(
          animal.assetCode
        );


      // ----------------------------------------------------
      // Find parent farm
      // ----------------------------------------------------

      const farm =
        farmByCode.get(
          assetCode
        );


      // ----------------------------------------------------
      // Safety:
      //
      // If the parent farm is not visible to the current
      // user, do not display the animal.
      // ----------------------------------------------------

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
        .push(
          animal
        );

    }


    // ======================================================
    // BUILD FARM TABLE DATA
    // ======================================================
    //
    // milk.ejs receives:
    //
    //     farms
    //
    // Each object contains:
    //
    //     farm
    //     animals
    //
    // Therefore EJS does not need to understand how
    // assetCode works.
    //
    // ======================================================

    const groupedFarms =
      [];


    for (
      const farm
      of farms
    ) {

      const farmCode =
        Number(
          farm.code
        );


      const farmAnimals =
        animalsByFarm.get(
          farmCode
        ) || [];


      // ----------------------------------------------------
      // Only create a table when the farm has animals.
      // ----------------------------------------------------

      if (
        farmAnimals.length === 0
      ) {

        continue;

      }


      groupedFarms.push({

        // --------------------------------------------------
        // FARM
        // --------------------------------------------------

        farm,


        // --------------------------------------------------
        // FARM IDENTIFICATION
        // --------------------------------------------------

        farmId:
          farm._id,

        farmName:
          farm.name,

        farmCode:


          farm.code,


        // --------------------------------------------------
        // ANIMALS
        // --------------------------------------------------

        animals:
          farmAnimals

      });

    }


    // ======================================================
    // SORT TABLES BY FARM CODE
    // ======================================================
    //
    // Negative codes:
    //
    // -1
    // -3
    // -5
    //
    // are sorted numerically.
    //
    // ======================================================

    groupedFarms.sort(
      (
        a,
        b
      ) => {

        return (

          Number(
            a.farmCode
          ) -

          Number(
            b.farmCode
          )

        );

      }
    );


    // ======================================================
    // BACKWARD COMPATIBILITY
    // ======================================================
    //
    // Keep `dairies` available because other existing
    // milk.ejs code may still reference it.
    //
    // The new milk.ejs should use `farms`.
    //
    // ======================================================

    const visibleDairies =
      groupedFarms.flatMap(
        group =>
          group.animals
      );


    // ======================================================
    // RENDER MILK
    // ======================================================

    return res.render(
      "milk",
      {

        // --------------------------------------------------
        // NEW PRIMARY DATA
        // --------------------------------------------------
        //
        // One item = one Dairy Farm table.
        //
        farms:
          groupedFarms,


        // --------------------------------------------------
        // BACKWARD COMPATIBILITY
        // --------------------------------------------------

        dairies:
          visibleDairies,


        // --------------------------------------------------
        // CURRENT SESSION
        // --------------------------------------------------

        session:
          currentSession,


        // --------------------------------------------------
        // AUTHENTICATION / ACCESS
        // --------------------------------------------------

        isAdmin,

        user:
          req.user,


        // --------------------------------------------------
        // RESULT POPUP
        // --------------------------------------------------

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

          farms:
            [],

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
// This section is unchanged.
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