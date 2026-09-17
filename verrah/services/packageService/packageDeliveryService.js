// =========================================================
// verrah/services/packageDeliveryService.js
//
// VERRAH COSMETICS
// PACKAGE DELIVERY SERVICE
// =========================================================

const mongoose = require("mongoose");

const Package = require("../../models/package");
const Product = require("../../models/products");
const User = require("../../models/user");
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

async function deliverPackage(req, id) {
  if (roleOf(req) !== "staff") {
    throw new Error(
      "Only staff can mark packages as delivered."
    );
  }

  const staffId = staffIdOf(req);

  const staffName = String(
    req.user.name ||
    req.user.email ||
    "Staff"
  ).trim();

  const dbSession =
    await mongoose.startSession();

  let delivered;

  try {
    await dbSession.withTransaction(
      async () => {

        // =============================================
        // STAFF
        // =============================================

        const staff =
          await User.findOne({
            _id: staffId,
            role: "staff"
          })
            .select(
              "_id assignedSubstation"
            )
            .session(
              dbSession
            )
            .lean();

        if (!staff) {
          throw new Error(
            "Staff account not found."
          );
        }

        if (!staff.assignedSubstation) {
          throw new Error(
            "You must have an assigned substation before delivering packages."
          );
        }


        // =============================================
        // PACKAGE
        // =============================================

        const pkg =
          await Package.findOne({
            _id: id,
            status: "confirmed",
            confirmedByStaffId: staffId
          })
            .session(
              dbSession
            );

        if (!pkg) {
          throw new Error(
            "Only the staff member who confirmed this package can deliver it."
          );
        }


        // =============================================
        // DUPLICATE PROTECTION
        // =============================================

        if (pkg.substationReductionRecorded) {
          throw new Error(
            "Inventory for this package has already been reduced."
          );
        }


        // =============================================
        // OPERATIONAL SUBSTATION
        // =============================================

        const substation =
          await Substation.findById(
            staff.assignedSubstation
          )
            .session(
              dbSession
            );

        if (!substation) {
          throw new Error(
            "The staff member's assigned substation does not exist."
          );
        }


        // =============================================
        // PROCESS ITEMS
        // =============================================

        for (const item of pkg.items) {
          const qty =
            Number(item.qty || 0);

          if (
            !Number.isInteger(qty) ||
            qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${item.name}.`
            );
          }


          // -------------------------------------------
          // PRODUCT
          // -------------------------------------------

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


          // -------------------------------------------
          // PRODUCT UNITS
          // -------------------------------------------

          const productUnits =
            Number(product.units || 0);

          if (productUnits < qty) {
            throw new Error(
              `Product "${item.name}" has only ${productUnits} units, but this package requires ${qty}.`
            );
          }


          // -------------------------------------------
          // PRODUCT SUBSTATION UNITS
          // -------------------------------------------

          const hasSubstationUnits =
            product.substationUnits !== undefined &&
            product.substationUnits !== null;

          let substationUnits = null;

          if (hasSubstationUnits) {
            substationUnits =
              Number(
                product.substationUnits || 0
              );

            if (substationUnits < qty) {
              throw new Error(
                `Product "${item.name}" has only ${substationUnits} substation units, but this package requires ${qty}.`
              );
            }
          }


          // -------------------------------------------
          // SUBSTATION INVENTORY
          // -------------------------------------------

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
            Number(inventory.units || 0);

          if (inventoryUnits < qty) {
            throw new Error(
              `${substation.name} has only ${inventoryUnits} units of ${item.name}, but this package requires ${qty}.`
            );
          }


          // -------------------------------------------
          // REDUCE PRODUCT
          // -------------------------------------------

          product.units =
            productUnits - qty;

          if (hasSubstationUnits) {
            product.substationUnits =
              substationUnits - qty;
          }

          await product.save({
            session: dbSession
          });


          // -------------------------------------------
          // REDUCE SUBSTATION INVENTORY
          // -------------------------------------------

          inventory.units =
            inventoryUnits - qty;

          inventory.updatedAt =
            new Date();


          // -------------------------------------------
          // PRODUCT REDUCTIONS
          // -------------------------------------------

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


        // =============================================
        // SAVE SUBSTATION
        // =============================================

        await substation.save({
          session: dbSession
        });


        // =============================================
        // MARK PACKAGE DELIVERED
        // =============================================

        pkg.status = "delivered";

        pkg.deliveredByStaffId =
          staffId;

        pkg.deliveredByStaffName =
          staffName;

        pkg.deliveredAt =
          new Date();

        pkg.deliveredSubstationId =
          staff.assignedSubstation;

        pkg.substationReductionRecorded =
          true;

        await pkg.save({
          session: dbSession
        });


        // =============================================
        // CLIENT
        // =============================================

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


        // =============================================
        // DELIVERED PACKAGE
        // =============================================

        delivered =
          await DeliveredPackage.findOneAndUpdate(
            {
              packageId: pkg._id
            },
            {
              packageId: pkg._id,

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
                      staff.assignedSubstation
                  })
                ),

              clientName:
                client?.name ||
                String(pkg.clientId),

              staffName,

              substationId:
                staff.assignedSubstation,

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

    return delivered;

  } finally {
    await dbSession.endSession();
  }
}


module.exports = {
  deliverPackage
};
