// =========================================================
// verrah/services/packageDeliveryService.js
//
// VERRAH COSMETICS
// DELIVER PACKAGE SERVICE
// =========================================================
//
// DELIVERY SUBSTATION RULE
// ---------------------------------------------------------
// The ONLY substation used for delivery is:
//
//     Package.packageSubstation
//
// Never use:
//
//     User.assignedSubstation
//     Package.confirmedSubstationId
//
// packageSubstation controls:
//     - inventory reduction
//     - deliveredSubstationId
//     - delivered package ledger
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


  const actorId =
    staffIdOf(req);

  const actorName =
    String(
      req.user?.name ||
      req.user?.email ||
      (
        role === "admin"
          ? "Admin"
          : "Staff"
      )
    ).trim();


  const dbSession =
    await mongoose.startSession();

  let delivered;


  try {

    await dbSession.withTransaction(
      async () => {


// =========================================================
// PACKAGE
// =========================================================

        const pkg =
          await Package.findOne({
            _id: id,
            status: "confirmed"
          })
            .session(
              dbSession
            );


        if (!pkg) {
          throw new Error(
            "Package must be confirmed first or does not exist."
          );
        }


// =========================================================
// PREVENT DOUBLE REDUCTION
// =========================================================

        if (
          pkg.substationReductionRecorded
        ) {
          throw new Error(
            "Inventory for this package has already been reduced."
          );
        }


// =========================================================
// PACKAGE SUBSTATION
// =========================================================
//
// This is the ONLY source of the operational
// delivery substation.
// =========================================================

        const operationalSubstationId =
          pkg.packageSubstation;


        if (
          !operationalSubstationId
        ) {
          throw new Error(
            "This package has no package substation."
          );
        }


// =========================================================
// LOAD PACKAGE SUBSTATION
// =========================================================

        const substation =
          await Substation.findById(
            operationalSubstationId
          )
            .session(
              dbSession
            );


        if (!substation) {
          throw new Error(
            "The package substation does not exist."
          );
        }


// =========================================================
// PROCESS PACKAGE ITEMS
// =========================================================

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


// =========================================================
// PRODUCT
// =========================================================

          const product =
            await Product.findById(
              item.productId
            )
              .session(
                dbSession
              );


          if (!product) {
            throw new Error(
              `Product "${item.name}" no longer exists.`
            );
          }


// =========================================================
// PRODUCT TOTAL STOCK
// =========================================================

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


// =========================================================
// PRODUCT SUBSTATION UNITS
// =========================================================
//
// Preserve the existing Product.substationUnits
// behavior when that field exists.
// =========================================================

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


// =========================================================
// PACKAGE SUBSTATION INVENTORY
// =========================================================
//
// IMPORTANT:
//
// This searches the product inventory inside the
// packageSubstation loaded above.
//
// It does NOT search the staff member's assigned
// substation.
// =========================================================

          const inventory =
            substation.productInventory.find(
              (entry) =>
                String(
                  entry.productId
                ) ===
                String(
                  item.productId
                )
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


// =========================================================
// REDUCE PRODUCT
// =========================================================

          product.units =
            productUnits - qty;


          if (
            hasSubstationUnits
          ) {

            product.substationUnits =
              substationUnits - qty;
          }


          await product.save({
            session:
              dbSession
          });


// =========================================================
// REDUCE PACKAGE SUBSTATION INVENTORY
// =========================================================

          inventory.units =
            inventoryUnits - qty;

          inventory.updatedAt =
            new Date();


// =========================================================
// UPDATE SUBSTATION REDUCTION LEDGER
// =========================================================

          const reduction =
            substation.productReductions.find(
              (entry) =>
                String(
                  entry.productId
                ) ===
                String(
                  item.productId
                )
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


// =========================================================
// SAVE PACKAGE SUBSTATION
// =========================================================

        await substation.save({
          session:
            dbSession
        });


// =========================================================
// MARK PACKAGE DELIVERED
// =========================================================

        pkg.status =
          "delivered";

        pkg.deliveredByStaffId =
          actorId;

        pkg.deliveredByStaffName =
          actorName;

        pkg.deliveredAt =
          new Date();


// =========================================================
// IMPORTANT:
// deliveredSubstationId ALWAYS equals packageSubstation
// =========================================================

        pkg.deliveredSubstationId =
          operationalSubstationId;

        pkg.substationReductionRecorded =
          true;


        await pkg.save({
          session:
            dbSession
        });


// =========================================================
// CLIENT
// =========================================================

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


// =========================================================
// DELIVERED PACKAGE LEDGER
// =========================================================
//
// Item prices/names/categories/images come directly
// from the package snapshots.
// =========================================================

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

                    substationId:
                      operationalSubstationId
                  })
                ),

              clientName:
                client?.name ||
                String(
                  pkg.clientId
                ),

              staffName:
                actorName,

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
              setDefaultsOnInsert:
                true,
              session:
                dbSession
            }
          );
      }
    );


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