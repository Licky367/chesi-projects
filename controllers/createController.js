const createService = require("../services/createService");
const Dairy = require("../models/dairy");


// ==========================================================
// RENDER CREATE PAGE
// ==========================================================

exports.renderCreatePage = async (req, res) => {

  try {

    // --------------------------------------------------------
    // Get Dairy Farms only.
    //
    // Negative code = Dairy Farm
    // --------------------------------------------------------

    const dairies = await Dairy.find({

      code: {
        $lt: 0
      }

    })
      .sort({
        name: 1
      });


    res.render("create", {

      error: null,

      success: null,

      dairies

    });

  } catch (error) {

    res.render("create", {

      error: error.message,

      success: null,

      dairies: []

    });

  }

};


// ==========================================================
// CREATE INVITATION
// ==========================================================

exports.createInvitation = async (req, res) => {

  try {

    const {
      email,
      role,
      assignedFarm
    } = req.body;


    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!email || !role) {

      const dairies = await Dairy.find({

        code: {
          $lt: 0
        }

      })
        .sort({
          name: 1
        });


      return res.render("create", {

        error: "Email and role are required",

        success: null,

        dairies

      });

    }


    // ========================================================
    // DAIRY WORKER
    //
    // A dairyWorker may receive one first farm during
    // invitation creation.
    // ========================================================

    if (
      role === "dairyWorker" &&
      !assignedFarm
    ) {

      const dairies = await Dairy.find({

        code: {
          $lt: 0
        }

      })
        .sort({
          name: 1
        });


      return res.render("create", {

        error:
          "A Dairy Farm must be selected for a Dairy Worker.",

        success: null,

        dairies

      });

    }


    // ========================================================
    // NON-DAIRY WORKERS
    //
    // assignedFarm must not be accepted for other roles.
    // ========================================================

    const farmAssignment =
      role === "dairyWorker"
        ? assignedFarm
        : null;


    // ========================================================
    // CREATE INVITATION
    // ========================================================

    await createService.createInvitation({

      email,

      role,

      assignedFarm: farmAssignment

    });


    // ========================================================
    // SUCCESS
    // ========================================================

    const dairies = await Dairy.find({

      code: {
        $lt: 0
      }

    })
      .sort({
        name: 1
      });


    res.render("create", {

      success:
        "Invitation created successfully",

      error: null,

      dairies

    });


  } catch (error) {

    // --------------------------------------------------------
    // Reload farms so the form still works after an error.
    // --------------------------------------------------------

    let dairies = [];

    try {

      dairies = await Dairy.find({

        code: {
          $lt: 0
        }

      })
        .sort({
          name: 1
        });

    } catch (farmError) {

      dairies = [];

    }


    res.render("create", {

      error: error.message,

      success: null,

      dairies

    });

  }

};