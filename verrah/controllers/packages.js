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

          const clientRole =
            roleMap.get(
              String(
                pkg.clientId
              )
            ) || "";


          const isDirectSell =
            clientRole === "staff";


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

            isDirectSell,

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

    const {
      packages: enrichedPackages
    } =
      await getEnrichedStaffPackages(
        req,
        status
      );


    const packages =
      enrichedPackages.filter(
        (pkg) =>
          pkg.isDirectSell ===
          false
      );


    const counts =
      getPackageCounts(
        packages
      );


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

      const {
        packages: enrichedPackages
      } =
        await getEnrichedStaffPackages(
          req,
          status
        );


      const packages =
        enrichedPackages.filter(
          (pkg) =>
            pkg.isDirectSell ===
            true
        );


      const counts =
        getPackageCounts(
          packages
        );


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
//
// IMPORTANT:
//
// Do NOT create a second/direct-sell determination here.
//
// The exact same enrichment helper used by
// /packages/staffDirect is used.
//
// This guarantees that:
//
//     isDirectSell
//
// has exactly the same value on the details page as it has
// on the direct-sell list page.
//
// The original packageDoc is retained so that:
//
//     salesName
//
// remains exactly as stored on the Package document.
// =========================================================

exports.staffDetails = async (
  req,
  res
) => {

  try {

    // -------------------------------------------------------
    // GET THE ORIGINAL PACKAGE
    // -------------------------------------------------------

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
    // GET THE SAME ENRICHED PACKAGE USED BY THE
    // DIRECT-SELL LIST
    // -------------------------------------------------------
    //
    // This is the important part.
    //
    // We do NOT rebuild salesName.
    //
    // We only obtain isDirectSell from the same helper that
    // already works on /packages/staffDirect.
    // -------------------------------------------------------

    const {
      packages: enrichedPackages
    } =
      await getEnrichedStaffPackages(
        req,
        "all"
      );


    const enrichedPackage =
      enrichedPackages.find(
        (pkg) =>
          String(
            pkg._id
          ) ===
          String(
            packageDoc._id
          )
      );


    // -------------------------------------------------------
    // ONLY ADD THE DIRECT-SELL FLAGS
    // -------------------------------------------------------
    //
    // Keep the original packageDoc intact.
    //
    // In particular:
    //
    //     packageDoc.salesName
    //
    // remains untouched.
    // -------------------------------------------------------

    if (enrichedPackage) {

      packageDoc.isDirectSell =
        enrichedPackage.isDirectSell;

      packageDoc.clientRole =
        enrichedPackage.clientRole;
    }


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