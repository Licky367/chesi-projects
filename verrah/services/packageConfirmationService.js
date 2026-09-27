// =========================================================
// verrah/services/packageConfirmationService.js
//
// VERRAH COSMETICS
// PACKAGE CONFIRMATION SERVICE
//
// BOTH ADMIN AND STAFF CAN CONFIRM PACKAGES.
//
// IMPORTANT BUSINESS RULE:
//
// Confirmation is ALWAYS performed at:
//
//     package.packageSubstation
//
// It is NEVER based on:
//
//     staff.assignedSubstation
//
// Therefore:
//
//     ADMIN  -> packageSubstation
//     STAFF  -> packageSubstation
//
// =========================================================

const mongoose =
  require("mongoose");

const Package =
  require("../models/package");

const Product =
  require("../models/products");

const Substation =
  require("../models/substations");


// =========================================================
// CHECK PACKAGE AVAILABILITY
// =========================================================
//
// Checks whether all products required by the package are
// available at the PACKAGE SUBSTATION.
//
// The substationId passed to this function must therefore be:
//
//     package.packageSubstation
//
// =========================================================

async function checkPackageAvailability(
  packageId,
  substationId,
  dbSession = null
) {

  // -------------------------------------------------------
  // PACKAGE
  // -------------------------------------------------------

  const pkgQuery =
    Package.findOne({

      _id:
        packageId,

      status:
        "pending"

    });


  // -------------------------------------------------------
  // SUBSTATION
  // -------------------------------------------------------

  const substationQuery =
    Substation.findOne({

      _id:
        substationId,

      isActive:
        true

    });


  // -------------------------------------------------------
  // SESSION
  // -------------------------------------------------------

  if (dbSession) {

    pkgQuery.session(
      dbSession
    );

    substationQuery.session(
      dbSession
    );

  }


  // -------------------------------------------------------
  // LOAD BOTH
  // -------------------------------------------------------

  const [
    pkg,
    substation
  ] =
    await Promise.all([

      pkgQuery,

      substationQuery

    ]);


  // -------------------------------------------------------
  // PACKAGE NOT FOUND
  // -------------------------------------------------------

  if (!pkg) {

    return {

      ok:
        false,

      message:
        "Package is no longer pending or does not exist."

    };

  }


  // -------------------------------------------------------
  // SUBSTATION NOT FOUND
  // -------------------------------------------------------

  if (!substation) {

    return {

      ok:
        false,

      message:
        "The package substation does not exist or is inactive."

    };

  }


  // =======================================================
  // PRODUCTS
  // =======================================================

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


  // =======================================================
  // CHECK EACH PACKAGE ITEM
  // =======================================================

  for (
    const item of pkg.items
  ) {

    const product =
      productMap.get(
        String(
          item.productId
        )
      );


    // -----------------------------------------------------
    // PRODUCT NO LONGER ACTIVE
    // -----------------------------------------------------

    if (!product) {

      return {

        ok:
          false,

        message:
          `Product ${item.name} is no longer active.`

      };

    }


    // -----------------------------------------------------
    // FIND PRODUCT IN PACKAGE SUBSTATION INVENTORY
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // NOT ENOUGH STOCK
    // -----------------------------------------------------

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


  // =======================================================
  // AVAILABLE
  // =======================================================

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
// BOTH ADMIN AND STAFF CAN check confirmation availability.
//
// IMPORTANT:
//
// The package's own packageSubstation is used.
//
// No staff assignment is required.
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


    // -----------------------------------------------------
    // ONLY ADMIN OR STAFF
    // -----------------------------------------------------

    if (
      role !== "admin" &&
      role !== "staff"
    ) {

      return {

        ok:
          false,

        message:
          "Admin or staff access required."

      };

    }


    try {

      // ===================================================
      // LOAD PENDING PACKAGE
      // ===================================================

      const packageDoc =
        await Package.findOne({

          _id:
            packageId,

          status:
            "pending"

        })
          .select(
            "_id status packageSubstation"
          )
          .lean();


      if (!packageDoc) {

        return {

          ok:
            false,

          message:
            "Package is no longer pending or does not exist."

        };

      }


      // ===================================================
      // PACKAGE SUBSTATION REQUIRED
      // ===================================================

      if (
        !packageDoc.packageSubstation
      ) {

        return {

          ok:
            false,

          message:
            "This package cannot be confirmed because no package substation has been assigned."

        };

      }


      // ===================================================
      // CHECK PACKAGE SUBSTATION
      // ===================================================
      //
      // IMPORTANT:
      //
      // This is the same substation for BOTH admin and
      // staff.
      //
      // ===================================================

      return checkPackageAvailability(

        packageId,

        packageDoc.packageSubstation

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
// BOTH ADMIN AND STAFF CAN CONFIRM.
//
// Confirmation location:
//
//     package.packageSubstation
//
// NOT:
//
//     staff.assignedSubstation
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


    // =======================================================
    // ADMIN OR STAFF
    // =======================================================

    if (
      role !== "admin" &&
      role !== "staff"
    ) {

      throw new Error(
        "Admin or staff access required."
      );

    }


    // =======================================================
    // VALIDATE PACKAGE ID
    // =======================================================

    if (
      !mongoose.isValidObjectId(
        packageId
      )
    ) {

      throw new Error(
        "Invalid package ID."
      );

    }


    // =======================================================
    // START TRANSACTION
    // =======================================================

    const session =
      await mongoose.startSession();


    try {

      let updated;


      await session.withTransaction(
        async function () {

          // ================================================
          // LOAD PENDING PACKAGE
          // ================================================

          const packageDoc =
            await Package.findOne({

              _id:
                packageId,

              status:
                "pending"

            })
              .select(
                "_id status packageSubstation"
              )
              .session(
                session
              )
              .lean();


          if (!packageDoc) {

            throw new Error(
              "Package is no longer pending or does not exist."
            );

          }


          // ================================================
          // PACKAGE SUBSTATION REQUIRED
          // ================================================

          if (
            !packageDoc.packageSubstation
          ) {

            throw new Error(
              "This package cannot be confirmed because no package substation has been assigned."
            );

          }


          // ================================================
          // CHECK AVAILABILITY
          //
          // IMPORTANT:
          //
          // packageSubstation is used for BOTH roles.
          // ================================================

          const state =
            await checkPackageAvailability(

              packageId,

              packageDoc.packageSubstation,

              session

            );


          if (!state.ok) {

            throw new Error(
              state.message
            );

          }


          // ================================================
          // CONFIRMER NAME
          // ================================================

          const confirmerName =
            String(

              req.user?.name ||

              req.user?.email ||

              (
                role === "admin"
                  ? "Admin"
                  : "Staff"
              )

            ).trim();


          // ================================================
          // UPDATE PACKAGE
          // ================================================
          //
          // Confirmation location is ALWAYS:
          //
          //     packageDoc.packageSubstation
          //
          // ================================================

          const update = {

            $set: {

              status:
                "confirmed",

              confirmedAt:
                new Date(),

              confirmedSubstationId:
                packageDoc.packageSubstation

            }

          };


          // ================================================
          // STAFF CONFIRMATION
          // ================================================
          //
          // Keep these existing fields because the existing
          // delivery logic uses confirmedByStaffId.
          //
          // ================================================

          if (
            role === "staff"
          ) {

            const staffId =
              String(
                req.user?._id ||
                req.user?.id ||
                ""
              );


            if (!staffId) {

              throw new Error(
                "Staff identity is missing."
              );

            }


            update.$set
              .confirmedByStaffId =
                staffId;


            update.$set
              .confirmedByStaffName =
                confirmerName;

          }


          // ================================================
          // ADMIN CONFIRMATION
          // ================================================
          //
          // Admin does NOT need an assigned substation.
          //
          // The confirmation location remains the package
          // substation.
          //
          // No invented admin-specific Package fields are
          // written here.
          //
          // ================================================


          // ================================================
          // ATOMIC CONFIRMATION
          // ================================================

          updated =
            await Package.findOneAndUpdate(

              {

                _id:
                  packageId,

                status:
                  "pending"

              },

              update,

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