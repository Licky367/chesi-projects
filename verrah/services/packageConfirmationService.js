// =========================================================
// verrah/services/packageConfirmationService.js
//
// VERRAH COSMETICS
// PACKAGE CONFIRMATION SERVICE
//
// BOTH ADMIN AND STAFF CAN CONFIRM.
//
// CONFIRMATION SUBSTATION:
//     package.packageSubstation
//
// NEVER:
//     staff.assignedSubstation
//
// DELIVERY / PAYMENT / CLEARING ARE NOT HANDLED HERE.
// =========================================================

const mongoose =
  require("mongoose");

const Package =
  require("../models/package");

const Product =
  require("../models/products");

const Substation =
  require("../models/substations");

const User =
  require("../models/user");


// =========================================================
// USER ID
// =========================================================

function userIdOf(req) {

  return String(
    req.user?._id ||
    req.user?.id ||
    ""
  );

}


// =========================================================
// CHECK PACKAGE AVAILABILITY
// =========================================================
//
// Availability is checked at:
//
//     package.packageSubstation
//
// This applies to BOTH:
//
//     admin
//     staff
//
// =========================================================

async function checkPackageAvailability(
  packageId,
  dbSession = null
) {

  const pkgQuery =
    Package.findOne({
      _id:
        packageId,

      status:
        "pending"
    });


  if (dbSession) {

    pkgQuery.session(
      dbSession
    );

  }


  const pkg =
    await pkgQuery;


  if (!pkg) {

    return {

      ok:
        false,

      message:
        "Package is no longer pending or does not exist."

    };

  }


  // -------------------------------------------------------
  // PACKAGE SUBSTATION
  // -------------------------------------------------------

  if (!pkg.packageSubstation) {

    return {

      ok:
        false,

      message:
        "This package has no package substation."

    };

  }


  const substationQuery =
    Substation.findOne({

      _id:
        pkg.packageSubstation,

      isActive:
        true

    });


  if (dbSession) {

    substationQuery.session(
      dbSession
    );

  }


  const substation =
    await substationQuery;


  if (!substation) {

    return {

      ok:
        false,

      message:
        "The package substation does not exist or is inactive."

    };

  }


  // -------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------

  const productIds =
    pkg.items
      .map(
        (item) =>
          item.productId
      )
      .filter(Boolean);


  const productsQuery =
    Product.find({

      _id: {
        $in:
          productIds
      },

      isActive:
        true

    });


  if (dbSession) {

    productsQuery.session(
      dbSession
    );

  }


  const products =
    await productsQuery.lean();


  const productMap =
    new Map(

      products.map(
        (product) => [

          String(
            product._id
          ),

          product

        ]
      )

    );


  // -------------------------------------------------------
  // CHECK EVERY PACKAGE ITEM
  // -------------------------------------------------------

  for (
    const item
    of pkg.items
  ) {

    const product =
      productMap.get(
        String(
          item.productId
        )
      );


    if (!product) {

      return {

        ok:
          false,

        message:
          `Product ${item.name} is no longer active.`

      };

    }


    const inventory =
      (
        substation.productInventory ||
        []
      ).find(
        (entry) =>
          String(
            entry.productId
          ) ===
          String(
            item.productId
          )
      );


    const available =
      Number(
        inventory?.units || 0
      );


    const required =
      Number(
        item.qty || 0
      );


    if (
      required >
      available
    ) {

      return {

        ok:
          false,

        message:
          `${substation.name} has ${available} units of ${item.name}, but the package requires ${required}.`

      };

    }

  }


  return {

    ok:
      true,

    package:
      pkg,

    substation

  };

}


// =========================================================
// GET CONFIRMATION STATE
// =========================================================
//
// BOTH ADMIN AND STAFF.
//
// =========================================================

exports.getConfirmationState =
  async function (
    req,
    packageId
  ) {

    const role =
      String(
        req.user?.role || ""
      ).toLowerCase();


    if (
      role !== "staff" &&
      role !== "admin"
    ) {

      return {

        ok:
          false,

        message:
          "Staff or admin access required."

      };

    }


    try {

      return await checkPackageAvailability(
        packageId
      );

    } catch (error) {

      return {

        ok:
          false,

        message:
          error.message

      };

    }

  };


// =========================================================
// CONFIRM PACKAGE
// =========================================================
//
// BOTH ADMIN AND STAFF.
//
// confirmedSubstationId ALWAYS:
//
//     package.packageSubstation
//
// confirmedByStaffId / confirmedByStaffName:
//
//     record the actual user who confirmed the package.
//
// This does NOT restrict delivery to the confirmer.
// Any authorized staff or admin can deliver a confirmed
// package.
//
// =========================================================

exports.confirmPackage =
  async function (
    req,
    packageId
  ) {

    const role =
      String(
        req.user?.role || ""
      ).toLowerCase();


    if (
      role !== "staff" &&
      role !== "admin"
    ) {

      throw new Error(
        "Staff or admin access required."
      );

    }


    if (
      !mongoose.isValidObjectId(
        packageId
      )
    ) {

      throw new Error(
        "Invalid package ID."
      );

    }


    const userId =
      userIdOf(
        req
      );


    if (!userId) {

      throw new Error(
        "User identity is missing."
      );

    }


    const user =
      await User.findById(
        userId
      )
        .select(
          "_id name email role"
        )
        .lean();


    if (!user) {

      throw new Error(
        "User account not found."
      );

    }


    const session =
      await mongoose.startSession();


    try {

      let updated;


      await session.withTransaction(
        async function () {

          // ------------------------------------------------
          // CHECK PACKAGE + PACKAGE SUBSTATION INVENTORY
          // ------------------------------------------------

          const state =
            await checkPackageAvailability(
              packageId,
              session
            );


          if (!state.ok) {

            throw new Error(
              state.message
            );

          }


          // ------------------------------------------------
          // CONFIRMER NAME
          // ------------------------------------------------

          const confirmerName =
            String(
              user.name ||
              user.email ||
              (
                role === "admin"
                  ? "Admin"
                  : "Staff"
              )
            ).trim();


          // ------------------------------------------------
          // CONFIRMATION
          //
          // ALWAYS packageSubstation.
          //
          // NEVER staff.assignedSubstation.
          // ------------------------------------------------

          const updateSet = {

            status:
              "confirmed",

            confirmedAt:
              new Date(),

            confirmedSubstationId:
              state.package.packageSubstation,

            confirmedByStaffId:
              userId,

            confirmedByStaffName:
              confirmerName

          };


          // ------------------------------------------------
          // UPDATE PACKAGE
          // ------------------------------------------------

          updated =
            await Package.findOneAndUpdate(

              {

                _id:
                  packageId,

                status:
                  "pending"

              },

              {

                $set:
                  updateSet

              },

              {

                new:
                  true,

                session

              }

            ).lean();


          if (!updated) {

            throw new Error(
              "Package is no longer pending or does not exist."
            );

          }

        }
      );


      return updated;


    } finally {

      await session.endSession();

    }

  };