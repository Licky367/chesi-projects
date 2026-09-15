// =========================================================
// verrah/controllers/packages.js
//
// VERRAH COSMETICS
// PACKAGE CONTROLLER
// =========================================================

const packageService =
  require("../services/packageService");

const paymentService =
  require("../services/paymentService");

const confirmationService =
  require("../services/packageConfirmationService");

const DeliveredPackage =
  require("../models/delivered");

const User =
  require("../models/user");


// =========================================================
// LIST USER PACKAGES
// =========================================================

exports.list = async (req, res) => {
  try {

    const packages =
      await packageService.getUserPackages(req);

    res.render(
      "packages/packages",
      {
        title:
          "My Packages | CoreVester",

        packages,

        error: null
      }
    );

  } catch (err) {

    console.error(err);

    res.status(500).render(
      "packages/packages",
      {
        title:
          "My Packages | CoreVester",

        packages: [],

        error:
          "Unable to load your packages."
      }
    );
  }
};


// =========================================================
// PACKAGE DETAILS
// =========================================================

exports.details = async (req, res) => {
  try {

    const packageDoc =
      await packageService.getUserPackage(
        req,
        req.params.id
      );

    if (!packageDoc) {

      return res
        .status(404)
        .render(
          "packages/package-details",
          {
            title:
              "Package not found | CoreVester",

            packageDoc: null,

            error:
              "Package not found."
          }
        );
    }

    res.render(
      "packages/package-details",
      {
        title:
          `Package ${String(
            packageDoc._id
          ).slice(-8)} | CoreVester`,

        packageDoc,

        error:
          req.query.error || null
      }
    );

  } catch (err) {

    console.error(err);

    res
      .status(404)
      .redirect("/packages");
  }
};


// =========================================================
// PAY FOR PACKAGE
// =========================================================

exports.pay = async (req, res) => {
  try {

    const result =
      await paymentService.initiatePackageStkPush(
        req,
        req.params.id,
        req.body.phoneNumber
      );

    return res.redirect(
      `/carts/payment/${result.paymentId}`
    );

  } catch (err) {

    console.error(
      "Package M-Pesa payment error:",
      err
    );

    return res.redirect(
      `/packages/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};


// =========================================================
// STAFF PACKAGE DATA BUILDER
// =========================================================
//
// This helper gets the staff packages ONCE.
//
// It then:
//
// 1. Gets the packages from packageService.
// 2. Finds the role of every package owner.
// 3. Defines:
//
//      isDirectSell = true
//
//    when the package belongs to a staff user.
//
// 4. Adds confirmationState.
//
// The resulting package objects are then used by BOTH:
//
//      packages/staff
//
// and
//
//      packages/staffDirectSells
//
// =========================================================

async function getEnrichedStaffPackages(
  req,
  status
) {

  // -------------------------------------------------------
  // GET PACKAGES FROM SERVICE
  // -------------------------------------------------------

  const result =
    await packageService.getStaffPackages(
      req,
      status
    );


  const packages =
    Array.isArray(result.packages)
      ? result.packages
      : [];


  // -------------------------------------------------------
  // GET CLIENT IDS
  // -------------------------------------------------------
  //
  // packageService already gives us clientId.
  //
  // We use those IDs to obtain the user's role.
  //
  // We do NOT depend on client.role because the service
  // currently selects:
  //
  //     _id name email phone
  //
  // and therefore does not return role.
  // -------------------------------------------------------

  const clientIds = [
    ...new Set(
      packages
        .map(
          (pkg) =>
            pkg.clientId
        )
        .filter(Boolean)
        .map(
          (id) =>
            String(id)
        )
    )
  ];


  // -------------------------------------------------------
  // GET CLIENT ROLES
  // -------------------------------------------------------

  const users =
    clientIds.length
      ? await User.find({
          _id: {
            $in: clientIds
          }
        })
          .select("_id role")
          .lean()
      : [];


  // -------------------------------------------------------
  // CREATE ROLE MAP
  // -------------------------------------------------------

  const roleMap =
    new Map(
      users.map(
        (user) => [
          String(user._id),
          String(
            user.role || ""
          ).toLowerCase()
        ]
      )
    );


  // -------------------------------------------------------
  // ENRICH PACKAGES
  // -------------------------------------------------------

  const enrichedPackages =
    await Promise.all(
      packages.map(
        async (pkg) => {

          /*
           * The package belongs to a staff user
           * when the role of its clientId is "staff".
           */
          const clientRole =
            roleMap.get(
              String(
                pkg.clientId
              )
            ) || "";


          const isDirectSell =
            clientRole === "staff";


          /*
           * Confirmation state is the same for both
           * package pages.
           */
          const confirmationState =
            pkg.status === "pending"
              ? await confirmationService.getConfirmationState(
                  req,
                  pkg._id
                )
              : {
                  ok: false,
                  message: ""
                };


          return {
            ...pkg,

            /*
             * This is the boolean we need.
             */
            isDirectSell,

            /*
             * Also expose the owner's role.
             * This can be useful to the EJS later.
             */
            clientRole,

            confirmationState
          };
        }
      )
    );


  return {
    packages:
      enrichedPackages,

    counts:
      result.counts
  };
}


// =========================================================
// CALCULATE COUNTS
// =========================================================
//
// Counts must be calculated AFTER filtering.
//
// This means:
//
// /packages/staff
//
// gets counts for normal packages only.
//
// /packages/staffDirectSells
//
// gets counts for direct-sale packages only.
// =========================================================

function getPackageCounts(
  packages
) {

  return {

    all:
      packages.length,

    pending:
      packages.filter(
        (pkg) =>
          pkg.status ===
          "pending"
      ).length,

    confirmed:
      packages.filter(
        (pkg) =>
          pkg.status ===
          "confirmed"
      ).length,

    delivered:
      packages.filter(
        (pkg) =>
          pkg.status ===
          "delivered"
      ).length
  };
}


// =========================================================
// STAFF PACKAGE LIST
// =========================================================
//
// Renders:
//
//     packages/staff
//
// ONLY:
//
//     isDirectSell === false
//
// =========================================================

exports.staffList = async (
  req,
  res
) => {

  const requestedStatus =
    String(
      req.query.status ||
      "all"
    ).toLowerCase();


  const allowedStatuses = [
    "all",
    "pending",
    "confirmed",
    "delivered"
  ];


  const status =
    allowedStatuses.includes(
      requestedStatus
    )
      ? requestedStatus
      : "all";


  try {

    // -----------------------------------------------------
    // GET AND ENRICH ONCE
    // -----------------------------------------------------

    const {
      packages: enrichedPackages
    } =
      await getEnrichedStaffPackages(
        req,
        status
      );


    // -----------------------------------------------------
    // NORMAL STAFF PACKAGES
    // -----------------------------------------------------
    //
    // Direct sells are excluded.
    // -----------------------------------------------------

    const packages =
      enrichedPackages.filter(
        (pkg) =>
          pkg.isDirectSell ===
          false
      );


    // -----------------------------------------------------
    // COUNTS FOR THIS PAGE
    // -----------------------------------------------------

    const counts =
      getPackageCounts(
        packages
      );


    // -----------------------------------------------------
    // RENDER
    // -----------------------------------------------------

    return res.render(
      "packages/staff",
      {
        title:
          "Package Management | CoreVester",

        packages,

        status,

        role:
          req.user.role,

        counts,

        error:
          req.query.error ||
          null,

        success:
          req.query.success ||
          null
      }
    );

  } catch (err) {

    console.error(err);

    return res
      .status(500)
      .render(
        "packages/staff",
        {
          title:
            "Package Management | CoreVester",

          packages: [],

          status,

          role:
            req.user.role,

          counts: {
            all: 0,
            pending: 0,
            confirmed: 0,
            delivered: 0
          },

          error:
            err.message,

          success:
            null
        }
      );
  }
};


// =========================================================
// STAFF DIRECT-SELL LIST
// =========================================================
//
// Renders:
//
//     packages/staffDirectSells
//
// ONLY:
//
//     isDirectSell === true
//
// =========================================================

exports.staffDirectSells =
  async (
    req,
    res
  ) => {

    const requestedStatus =
      String(
        req.query.status ||
        "all"
      ).toLowerCase();


    const allowedStatuses = [
      "all",
      "pending",
      "confirmed",
      "delivered"
    ];


    const status =
      allowedStatuses.includes(
        requestedStatus
      )
        ? requestedStatus
        : "all";


    try {

      // ---------------------------------------------------
      // GET AND ENRICH ONCE
      // ---------------------------------------------------

      const {
        packages: enrichedPackages
      } =
        await getEnrichedStaffPackages(
          req,
          status
        );


      // ---------------------------------------------------
      // DIRECT SELL PACKAGES
      // ---------------------------------------------------

      const packages =
        enrichedPackages.filter(
          (pkg) =>
            pkg.isDirectSell ===
            true
        );


      // ---------------------------------------------------
      // COUNTS FOR DIRECT SELLS
      // ---------------------------------------------------

      const counts =
        getPackageCounts(
          packages
        );


      // ---------------------------------------------------
      // RENDER
      // ---------------------------------------------------

      return res.render(
        "packages/staffDirectSells",
        {
          title:
            "Direct Sell Packages | CoreVester",

          packages,

          status,

          role:
            req.user.role,

          counts,

          error:
            req.query.error ||
            null,

          success:
            req.query.success ||
            null
        }
      );

    } catch (err) {

      console.error(err);

      return res
        .status(500)
        .render(
          "packages/staffDirectSells",
          {
            title:
              "Direct Sell Packages | CoreVester",

            packages: [],

            status,

            role:
              req.user.role,

            counts: {
              all: 0,
              pending: 0,
              confirmed: 0,
              delivered: 0
            },

            error:
              err.message,

            success:
              null
          }
        );
    }
  };


// =========================================================
// STAFF PACKAGE DETAILS
// =========================================================

exports.staffDetails = async (
  req,
  res
) => {

  try {

    const packageDoc =
      await packageService.getStaffPackage(
        req,
        req.params.id
      );


    if (!packageDoc) {

      return res
        .status(404)
        .render(
          "packages/staff-details",
          {
            title:
              "Package not found | CoreVester",

            packageDoc:
              null,

            role:
              req.user.role,

            user:
              req.user,

            canConfirm:
              false,

            cleared:
              false,

            confirmationError:
              "Package not found or not assigned to you.",

            error:
              "Package not found or not assigned to you."
          }
        );
    }


    // -------------------------------------------------------
    // DETERMINE WHETHER THIS IS A DIRECT SELL
    // -------------------------------------------------------
    //
    // A package is a direct sell when the user who owns
    // the package has role === "staff".
    //
    // packageService does not currently return the user's
    // role, so we retrieve it here using clientId.
    // -------------------------------------------------------

    const packageOwner =
      packageDoc.clientId
        ? await User.findById(
            packageDoc.clientId
          )
            .select("_id role")
            .lean()
        : null;


    const clientRole =
      String(
        packageOwner?.role ||
        ""
      ).toLowerCase();


    const isDirectSell =
      clientRole === "staff";


    // -------------------------------------------------------
    // ADD DIRECT-SELL INFORMATION TO PACKAGE DOC
    // -------------------------------------------------------

    packageDoc.isDirectSell =
      isDirectSell;

    packageDoc.clientRole =
      clientRole;


    // -------------------------------------------------------
    // CONFIRMATION STATE
    // -------------------------------------------------------

    const confirmationState =
      packageDoc.status === "pending"
        ? await confirmationService.getConfirmationState(
            req,
            packageDoc._id
          )
        : {
            ok: false,
            message: ""
          };


    // -------------------------------------------------------
    // DELIVERED RECORD
    // -------------------------------------------------------

    const deliveredRecord =
      await DeliveredPackage.findOne({
        packageId:
          packageDoc._id
      })
        .select(
          "cleared clearedAt clearedByStaffId clearedByStaffName"
        )
        .lean();


    // -------------------------------------------------------
    // RENDER
    // -------------------------------------------------------

    res.render(
      "packages/staff-details",
      {
        title:
          `Package ${String(
            packageDoc._id
          ).slice(-8)} | Package Management`,

        packageDoc,

        role:
          req.user.role,

        user:
          req.user,

        canConfirm:
          confirmationState.ok,

        confirmationError:
          confirmationState.ok
            ? null
            : confirmationState.message,

        cleared:
          Boolean(
            deliveredRecord?.cleared
          ),

        clearedAt:
          deliveredRecord?.clearedAt ||
          null,

        clearedByStaffName:
          deliveredRecord?.clearedByStaffName ||
          "",

        error:
          req.query.error ||
          null,

        success:
          req.query.success ||
          null
      }
    );

  } catch (err) {

    console.error(err);

    res
      .status(404)
      .redirect(
        "/packages/staff"
      );
  }
};


// =========================================================
// CONFIRM
// =========================================================

exports.confirm = async (
  req,
  res
) => {

  try {

    await packageService.confirmPackage(
      req,
      req.params.id
    );


    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package confirmed and assigned to you."
      )}`
    );

  } catch (err) {

    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};


// =========================================================
// DELIVER
// =========================================================

exports.deliver = async (
  req,
  res
) => {

  try {

    await packageService.deliverPackage(
      req,
      req.params.id
    );


    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as delivered and the substation delivery ledger was updated."
      )}`
    );

  } catch (err) {

    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};


// =========================================================
// RECORD PAYMENT
// =========================================================

exports.recordPayment =
  async (
    req,
    res
  ) => {

    try {

      const deliveredRecord =
        await DeliveredPackage.findOne({
          packageId:
            req.params.id
        })
          .select("cleared")
          .lean();


      if (
        deliveredRecord?.cleared
      ) {

        throw new Error(
          "This package has already been cleared. No further payment entry is allowed."
        );
      }


      await packageService.recordPayment(
        req,
        req.params.id,
        req.body.amountPaid
      );


      return res.redirect(
        `/packages/staff/${req.params.id}?success=${encodeURIComponent(
          "Amount paid updated."
        )}`
      );

    } catch (err) {

      console.error(err);

      return res.redirect(
        `/packages/staff/${req.params.id}?error=${encodeURIComponent(
          err.message
        )}`
      );
    }
  };


// =========================================================
// CLEAR
// =========================================================

exports.clear = async (
  req,
  res
) => {

  try {

    const role =
      String(
        req.user?.role ||
        ""
      ).toLowerCase();


    const staffId =
      String(
        req.user?._id ||
        req.user?.id ||
        ""
      );


    if (
      role !== "staff" &&
      role !== "admin"
    ) {

      throw new Error(
        "Staff or admin access required."
      );
    }


    const packageDoc =
      await packageService.getStaffPackage(
        req,
        req.params.id
      );


    if (!packageDoc) {

      throw new Error(
        "Package not found or not assigned to you."
      );
    }


    if (
      packageDoc.status !==
      "delivered"
    ) {

      throw new Error(
        "Only delivered packages can be cleared."
      );
    }


    const arrears =
      Math.max(
        0,
        Number(
          packageDoc.totalAmount ||
          0
        ) -
        Number(
          packageDoc.paidAmount ||
          0
        )
      );


    if (
      arrears > 0
    ) {

      throw new Error(
        "This package cannot be cleared while it has outstanding arrears."
      );
    }


    if (
      role === "staff" &&
      String(
        packageDoc.deliveredByStaffId ||
        ""
      ) !== staffId
    ) {

      throw new Error(
        "Only the staff member who delivered this package can clear it."
      );
    }


    const deliveredRecord =
      await DeliveredPackage.findOne({
        packageId:
          packageDoc._id
      });


    if (!deliveredRecord) {

      throw new Error(
        "Delivered package record was not found."
      );
    }


    if (
      deliveredRecord.cleared
    ) {

      throw new Error(
        "This package has already been cleared."
      );
    }


    deliveredRecord.cleared =
      true;

    deliveredRecord.clearedAt =
      new Date();

    deliveredRecord.clearedByStaffId =
      staffId;

    deliveredRecord.clearedByStaffName =
      String(
        req.user?.name ||
        req.user?.email ||
        "Staff"
      ).trim();


    await deliveredRecord.save();


    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as cleared."
      )}`
    );

  } catch (err) {

    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};