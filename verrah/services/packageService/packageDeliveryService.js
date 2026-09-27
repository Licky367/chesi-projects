// =========================================================
// verrah/services/packageDeliveryService.js
// VERRAH COSMETICS - DELIVER PACKAGE
// =========================================================
//
// DELIVERY RULE
// ---------------------------------------------------------
// The package's packageSubstation is ALWAYS the operational
// substation for delivery.
//
// Inventory reduction MUST happen against:
//     pkg.packageSubstation
//
// It must NEVER use:
//     req.user.assignedSubstation
//     pkg.confirmedSubstationId
// =========================================================

const mongoose =
  require("mongoose");

const Package =
  require("../../models/package");

const Product =
  require("../../models/products");

const User =
  require("../../models/user");

const DeliveredPackage =
  require("../../models/delivered");

const Substation =
  require("../../models/substations");

const {
  roleOf,
  staffIdOf
} = require("./packageHelpers");


// =========================================================
// DELIVER PACKAGE
// =========================================================

async function deliverPackage(
  req,
  id
) {

  // -------------------------------------------------------
  // ROLE
  // -------------------------------------------------------

  const role =
    roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Only staff or admin can mark packages as delivered."
    );
  }


  // -------------------------------------------------------
  // DELIVERY USER
  // -------------------------------------------------------

  const staffId =
    staffIdOf(req);

  const staffName =
    String(
      req.user?.name ||
      req.user?.email ||
      (
        role === "admin"
          ? "Admin"
          : "Staff"
      )
    ).trim();


  // -------------------------------------------------------
  // DATABASE SESSION
  // -------------------------------------------------------

  const dbSession =
    await mongoose.startSession();

  let delivered;


  try {

    await dbSession.withTransaction(
      async () => {

        // =================================================
        // PACKAGE
        // =================================================

        const pkg =
          await Package.findOne({
            _id: id,
            status: "confirmed"
          }).session(dbSession);


        if (!pkg) {
          throw new Error(
            "Package must be confirmed first or does not exist."
          );
        }


        // =================================================
        // PREVENT DOUBLE REDUCTION
        // =================================================

        if (
          pkg.substationReductionRecorded
        ) {
          throw new Error(
            "Inventory for this package has already been reduced."
          );
        }


        // =================================================
        // PACKAGE SUBSTATION
        // =================================================
        //
        // IMPORTANT:
        //
        // Delivery ALWAYS uses packageSubstation.
        //
        // Never use:
        //     req.user.assignedSubstation
        //
        // Never fall back to:
        //     confirmedSubstationId
        //
        // =================================================

        const operationalSubstationId =
          pkg.packageSubstation;


        if (
          !operationalSubstationId
        ) {
          throw new Error(
            "This package has no package substation."
          );
        }


        // =================================================
        // GET PACKAGE SUBSTATION
        // =================================================

        const substation =
          await Substation.findById(
            operationalSubstationId
          ).session(dbSession);


        if (!substation) {
          throw new Error(
            "The package substation does not exist."
          );
        }


        // =================================================
        // PROCESS PACKAGE ITEMS
        // =================================================

        for (
          const item of pkg.items
        ) {

          const qty =
            Number(
              item.qty || 0
            );


          if (
            !Number.isInteger(qty) ||
            qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${item.name}.`
            );
          }


          // -----------------------------------------------
          // PRODUCT
          // -----------------------------------------------

          const product =
            await Product.findById(
              item.productId
            ).session(dbSession);


          if (!product) {
            throw new Error(
              `Product "${item.name}" no longer exists.`
            );
          }


          // -----------------------------------------------
          // PRODUCT TOTAL UNITS
          // -----------------------------------------------

          const productUnits =
            Number(
              product.units || 0
            );


          if (
            productUnits < qty
          ) {
            throw new Error(
              `Product "${item.name}" has only ${productUnits} units, but this package requires ${qty}.`
            );
          }


          // -----------------------------------------------
          // PRODUCT SUBSTATION UNITS
          // -----------------------------------------------

          const hasSubstationUnits =
            product.substationUnits !== undefined &&
            product.substationUnits !== null;


          let substationUnits =
            null;


          if (
            hasSubstationUnits
          ) {

            substationUnits =
              Number(
                product.substationUnits || 0
              );


            if (
              substationUnits < qty
            ) {
              throw new Error(
                `Product "${item.name}" has only ${substationUnits} substation units, but this package requires ${qty}.`
              );
            }
          }


          // =================================================
          // PACKAGE SUBSTATION INVENTORY
          // =================================================
          //
          // This lookup is performed ONLY against the
          // package's packageSubstation.
          //
          // The logged-in staff member's assignedSubstation
          // is completely irrelevant here.
          // =================================================

          const inventory =
            substation.productInventory.find(
              (entry) =>
                String(entry.productId) ===
                String(item.productId)
            );


          if (!inventory) {
            throw new Error(
              `${item.name} is not allocated to ${substation.name}.`
            );
          }


          const inventoryUnits =
            Number(
              inventory.units || 0
            );


          if (
            inventoryUnits < qty
          ) {
            throw new Error(
              `${substation.name} has only ${inventoryUnits} units of ${item.name}, but this package requires ${qty}.`
            );
          }


          // =================================================
          // REDUCE PRODUCT
          // =================================================

          product.units =
            productUnits - qty;


          if (
            hasSubstationUnits
          ) {
            product.substationUnits =
              substationUnits - qty;
          }


          await product.save({
            session: dbSession
          });


          // =================================================
          // REDUCE PACKAGE SUBSTATION INVENTORY
          // =================================================

          inventory.units =
            inventoryUnits - qty;

          inventory.updatedAt =
            new Date();


          // =================================================
          // SUBSTATION REDUCTION LEDGER
          // =================================================

          const reduction =
            substation.productReductions.find(
              (entry) =>
                String(entry.productId) ===
                String(item.productId)
            );


          if (reduction) {

            reduction.unitsReduced =
              Number(
                reduction.unitsReduced || 0
              ) + qty;

            reduction.productName =
              item.name;

            reduction.category =
              item.category ||
              reduction.category ||
              "";

            reduction.lastReducedAt =
              new Date();

          } else {

            substation.productReductions.push({
              productId:
                item.productId,

              productName:
                item.name,

              category:
                item.category || "",

              unitsReduced:
                qty,

              lastReducedAt:
                new Date()
            });
          }
        }


        // =================================================
        // SAVE PACKAGE SUBSTATION
        // =================================================

        await substation.save({
          session: dbSession
        });


        // =================================================
        // MARK PACKAGE AS DELIVERED
        // =================================================

        pkg.status =
          "delivered";

        pkg.deliveredByStaffId =
          staffId;

        pkg.deliveredByStaffName =
          staffName;

        pkg.deliveredAt =
          new Date();

        // IMPORTANT:
        // This is the packageSubstation used above.
        pkg.deliveredSubstationId =
          operationalSubstationId;

        pkg.substationReductionRecorded =
          true;


        await pkg.save({
          session: dbSession
        });


        // =================================================
        // CLIENT
        // =================================================

        const client =
          await User.findById(
            pkg.clientId
          )
            .select(
              "name phone"
            )
            .session(
              dbSession
            )
            .lean();


        // =================================================
        // DELIVERED PACKAGE LEDGER
        // =================================================

        delivered =
          await DeliveredPackage.findOneAndUpdate(
            {
              packageId:
                pkg._id
            },
            {
              packageId:
                pkg._id,

              products:
                pkg.items.map(
                  (item) => ({
                    productId:
                      item.productId,

                    name:
                      item.name,

                    category:
                      item.category || "",

                    price:
                      item.price,

                    qty:
                      item.qty,

                    image:
                      item.image || "",

                    // IMPORTANT:
                    // Always the packageSubstation.
                    substationId:
                      operationalSubstationId
                  })
                ),

              clientName:
                client?.name ||
                String(pkg.clientId),

              staffName,

              // IMPORTANT:
              // Always the packageSubstation.
              substationId:
                operationalSubstationId,

              amountPaid:
                Number(
                  pkg.paidAmount || 0
                ),

              arrearsAmount:
                Math.max(
                  0,
                  Number(
                    pkg.totalAmount || 0
                  ) -
                  Number(
                    pkg.paidAmount || 0
                  )
                )
            },
            {
              new: true,
              upsert: true,
              setDefaultsOnInsert: true,
              session: dbSession
            }
          );
      }
    );


    // =====================================================
    // RETURN DELIVERED RECORD
    // =====================================================

    return delivered;


  } finally {

    await dbSession.endSession();

  }
}


// =========================================================
// EXPORT
// =========================================================

module.exports = {
  deliverPackage
};