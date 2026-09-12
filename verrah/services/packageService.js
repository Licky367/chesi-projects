// =========================================================
// verrah/services/packageService.js
//
// VERRAH COSMETICS
// PACKAGE SERVICE
// =========================================================

const mongoose =
  require("mongoose");

const Cart =
  require("../models/carts");

const Package =
  require("../models/package");

const Payment =
  require("../models/Payment");

const Product =
  require("../models/products");

const User =
  require("../models/user");

const DeliveredPackage =
  require("../models/delivered");

const Substation =
  require("../models/substations");

const {
  getUserId,
  getSessionId
} = require("./shopContext");


// =========================================================
// PAYMENT STATUS
// =========================================================

function getPaymentStatus(
  totalAmount,
  totalPaid
) {
  const total =
    Math.max(
      0,
      Number(totalAmount || 0)
    );

  const paid =
    Math.max(
      0,
      Number(totalPaid || 0)
    );

  if (paid <= 0) {
    return "unpaid";
  }

  if (paid >= total) {
    return "paid";
  }

  return "partialPaid";
}


// =========================================================
// CONFIRMED PAYMENT TOTAL
// =========================================================

async function getConfirmedPaymentTotal(
  packageId,
  dbSession = null
) {
  const aggregate =
    Payment.aggregate([
      {
        $match: {
          packageId,
          status: "confirmed"
        }
      },

      {
        $group: {
          _id: null,

          totalPaid: {
            $sum: {
              $ifNull: [
                "$paidAmount",
                0
              ]
            }
          }
        }
      }
    ]);

  if (dbSession) {
    aggregate.session(
      dbSession
    );
  }

  const result =
    await aggregate;

  return Math.max(
    0,
    Number(
      result[0]?.totalPaid || 0
    )
  );
}


// =========================================================
// ROLE HELPERS
// =========================================================

function roleOf(req) {
  return String(
    req.user?.role || ""
  ).toLowerCase();
}


function staffIdOf(req) {
  return String(
    req.user?._id ||
    req.user?.id ||
    ""
  );
}


// =========================================================
// STATUS NORMALIZER
// =========================================================

function normalizeStatus(
  status
) {
  return [
    "all",
    "pending",
    "confirmed",
    "delivered"
  ].includes(status)
    ? status
    : "all";
}


// =========================================================
// CREATE PACKAGE FROM CART
// =========================================================

async function createPackageFromCart(
  req,
  paymentData = {}
) {
  const clientId =
    getUserId(req);

  const sessionId =
    getSessionId(req);

  if (!clientId) {
    throw new Error(
      "Login is required."
    );
  }

  if (!sessionId) {
    throw new Error(
      "Cart session is missing."
    );
  }

  const dbSession =
    await mongoose.startSession();

  let created;

  try {

    await dbSession.withTransaction(
      async () => {

        const cart =
          await Cart.findOne({
            sessionId,
            user: clientId
          })
            .session(
              dbSession
            );

        if (
          !cart ||
          !cart.items.length
        ) {
          throw new Error(
            "Your cart is empty."
          );
        }

        const productIds =
          cart.items
            .map(
              (item) =>
                item.product ||
                item.productId
            )
            .filter(Boolean);

        const products =
          await Product.find({
            _id: {
              $in: productIds
            }
          })
            .session(
              dbSession
            )
            .lean();

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

        const items =
          cart.items.map(
            (item) => {

              const source =
                productMap.get(
                  String(
                    item.product ||
                    item.productId
                  )
                );

              return {
                productId:
                  item.product ||
                  item.productId,

                name:
                  item.name,

                category:
                  source?.category ||
                  "",

                subcategory:
                  source?.subcategory ||
                  "",

                days:
                  Number(
                    source?.days || 0
                  ),

                price:
                  Number(
                    item.price || 0
                  ),

                qty:
                  Number(
                    item.qty || 0
                  ),

                image:
                  item.image || ""
              };
            }
          );

        const totalAmount =
          items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              item.price *
                item.qty,
            0
          );

        [
          created
        ] =
          await Package.create(
            [
              {
                clientId,

                items,

                totalAmount,

                paymentMethod:
                  paymentData.paymentMethod ||
                  "pay_on_delivery",

                paymentStatus:
                  paymentData.paymentStatus ===
                  "paid"
                    ? "paid"
                    : "unpaid",

                paidAmount:
                  paymentData.paymentStatus ===
                  "paid"
                    ? Number(
                        paymentData.paidAmount ||
                        0
                      )
                    : 0,

                mpesaReceiptNumber:
                  paymentData.mpesaReceiptNumber ||
                  "",

                phoneNumber:
                  paymentData.phoneNumber ||
                  "",

                status:
                  "pending"
              }
            ],
            {
              session:
                dbSession
            }
          );

        /*
         * Product inventory was already handled by the
         * cart/payment process.
         *
         * No inventory reduction is performed here.
         */

        await Cart.deleteOne(
          {
            _id: cart._id
          },
          {
            session:
              dbSession
          }
        );
      }
    );

    return created;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// CREATE PACKAGE FROM PAYMENT
// =========================================================

async function createPackageFromPayment(
  paymentId
) {
  const dbSession =
    await mongoose.startSession();

  let packageDoc;

  try {

    await dbSession.withTransaction(
      async () => {

        const payment =
          await Payment.findOne({
            _id: paymentId,
            status: "confirmed"
          })
            .session(
              dbSession
            );

        if (!payment) {
          return;
        }

        const existing =
          await Package.findOne({
            clientId:
              payment.clientId,

            paymentMethod:
              "mpesa",

            mpesaReceiptNumber:
              payment.mpesaReceiptNumber
          })
            .session(
              dbSession
            );

        if (existing) {

          packageDoc =
            existing;

          return;
        }

        const productIds =
          (
            payment.cartItems ||
            []
          )
            .map(
              (item) =>
                item.productId
            )
            .filter(Boolean);

        const products =
          await Product.find({
            _id: {
              $in: productIds
            }
          })
            .session(
              dbSession
            )
            .lean();

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

        const items =
          payment.cartItems.map(
            (item) => {

              const source =
                productMap.get(
                  String(
                    item.productId
                  )
                );

              return {
                productId:
                  item.productId,

                name:
                  item.name,

                category:
                  source?.category ||
                  "",

                subcategory:
                  source?.subcategory ||
                  "",

                days:
                  Number(
                    source?.days || 0
                  ),

                price:
                  Number(
                    item.price || 0
                  ),

                qty:
                  Number(
                    item.qty || 0
                  ),

                image:
                  item.image || ""
              };
            }
          );

        [
          packageDoc
        ] =
          await Package.create(
            [
              {
                clientId:
                  payment.clientId,

                items,

                totalAmount:
                  payment.amount,

                paymentMethod:
                  "mpesa",

                paymentStatus:
                  "paid",

                paidAmount:
                  Number(
                    payment.paidAmount ||
                    payment.amount ||
                    0
                  ),

                mpesaReceiptNumber:
                  payment.mpesaReceiptNumber ||
                  "",

                phoneNumber:
                  payment.phoneNumber ||
                  "",

                status:
                  "pending"
              }
            ],
            {
              session:
                dbSession
            }
          );

        const cart =
          await Cart.findOne({
            sessionId:
              payment.sessionId,

            user:
              payment.clientId
          })
            .session(
              dbSession
            );

        if (!cart) {
          return;
        }

        for (
          const paidItem of
          payment.cartItems
        ) {

          const current =
            cart.items.find(
              (item) =>
                String(
                  item.productId
                ) ===
                String(
                  paidItem.productId
                )
            );

          if (!current) {
            continue;
          }

          current.qty -=
            Number(
              paidItem.qty || 0
            );

          if (
            current.qty <= 0
          ) {

            cart.items =
              cart.items.filter(
                (item) =>
                  String(
                    item.productId
                  ) !==
                  String(
                    paidItem.productId
                  )
              );
          }
        }

        if (
          cart.items.length
        ) {

          await cart.save({
            session:
              dbSession
          });

        } else {

          await Cart.deleteOne(
            {
              _id: cart._id
            },
            {
              session:
                dbSession
            }
          );
        }
      }
    );

    return packageDoc;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// GET USER PACKAGES
// =========================================================

async function getUserPackages(
  req
) {
  const clientId =
    getUserId(req);

  if (!clientId) {
    throw new Error(
      "Login is required."
    );
  }

  return Package.find({
    clientId
  })
    .sort({
      createdAt: -1
    })
    .lean();
}


// =========================================================
// GET USER PACKAGE
// =========================================================

async function getUserPackage(
  req,
  id
) {
  const clientId =
    getUserId(req);

  if (!clientId) {
    throw new Error(
      "Login is required."
    );
  }

  return Package.findOne({
    _id: id,
    clientId
  }).lean();
}


// =========================================================
// GET STAFF PACKAGES
// =========================================================

async function getStaffPackages(
  req,
  status = "all"
) {
  const role =
    roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Staff or admin access required."
    );
  }

  status =
    normalizeStatus(
      status
    );

  let visibleQuery = {};

  if (
    role === "staff"
  ) {

    const id =
      staffIdOf(req);

    if (!id) {
      throw new Error(
        "Staff identity is missing."
      );
    }

    visibleQuery = {
      $or: [
        {
          status:
            "pending"
        },

        {
          confirmedByStaffId:
            id
        }
      ]
    };
  }

  const allVisible =
    await Package.find(
      visibleQuery
    )
      .sort({
        createdAt: -1
      })
      .populate(
        "confirmedSubstationId",
        "name location"
      )
      .populate(
        "deliveredSubstationId",
        "name location"
      )
      .lean();

  const counts = {

    all:
      allVisible.length,

    pending:
      allVisible.filter(
        (p) =>
          p.status ===
          "pending"
      ).length,

    confirmed:
      allVisible.filter(
        (p) =>
          p.status ===
          "confirmed"
      ).length,

    delivered:
      allVisible.filter(
        (p) =>
          p.status ===
          "delivered"
      ).length
  };

  const packages =
    status === "all"
      ? allVisible
      : allVisible.filter(
          (p) =>
            p.status ===
            status
        );

  const clientIds =
    [
      ...new Set(
        packages
          .map(
            (p) =>
              String(
                p.clientId
              )
          )
          .filter(Boolean)
      )
    ];

  const clients =
    await User.find({
      _id: {
        $in: clientIds
      }
    })
      .select(
        "_id name email"
      )
      .lean();

  const clientMap =
    new Map(
      clients.map(
        (client) => [
          String(
            client._id
          ),
          client
        ]
      )
    );

  return {

    packages:
      packages.map(
        (pkg) => ({

          ...pkg,

          client:
            clientMap.get(
              String(
                pkg.clientId
              )
            ) || null,

          totalPaid:
            Math.max(
              0,
              Number(
                pkg.paidAmount ||
                0
              )
            ),

          arrearsAmount:
            Math.max(
              0,
              Number(
                pkg.totalAmount ||
                0
              ) -
              Number(
                pkg.paidAmount ||
                0
              )
            )
        })
      ),

    counts
  };
}


// =========================================================
// GET STAFF PACKAGE
// =========================================================

async function getStaffPackage(
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
      "Staff or admin access required."
    );
  }

  const pkg =
    await Package.findById(
      id
    )
      .populate(
        "confirmedSubstationId",
        "name location"
      )
      .populate(
        "deliveredSubstationId",
        "name location"
      )
      .lean();

  if (!pkg) {
    return null;
  }

  if (
    role === "staff"
  ) {

    const staffId =
      staffIdOf(req);

    if (
      pkg.status !==
        "pending" &&
      String(
        pkg.confirmedByStaffId ||
        ""
      ) !== staffId
    ) {
      return null;
    }
  }

  const client =
    await User.findById(
      pkg.clientId
    )
      .select(
        "_id name email"
      )
      .lean();

  return {

    ...pkg,

    client,

    totalPaid:
      Math.max(
        0,
        Number(
          pkg.paidAmount ||
          0
        )
      ),

    arrearsAmount:
      Math.max(
        0,
        Number(
          pkg.totalAmount ||
          0
        ) -
        Number(
          pkg.paidAmount ||
          0
        )
      )
  };
}


// =========================================================
// CONFIRM PACKAGE
// =========================================================

async function confirmPackage(
  req,
  id
) {
  if (
    roleOf(req) !==
    "staff"
  ) {
    throw new Error(
      "Only staff can confirm packages."
    );
  }

  const staffId =
    staffIdOf(req);

  const staffName =
    String(
      req.user.name ||
      req.user.email ||
      "Staff"
    ).trim();

  const staff =
    await User.findOne({
      _id: staffId,
      role: "staff"
    })
      .select(
        "_id assignedSubstation"
      )
      .lean();

  if (!staff) {
    throw new Error(
      "Staff account not found."
    );
  }

  if (
    !staff.assignedSubstation
  ) {
    throw new Error(
      "You must have an assigned substation before confirming packages."
    );
  }

  const updated =
    await Package.findOneAndUpdate(
      {
        _id: id,
        status: "pending"
      },

      {
        $set: {

          status:
            "confirmed",

          confirmedByStaffId:
            staffId,

          confirmedByStaffName:
            staffName,

          confirmedAt:
            new Date(),

          confirmedSubstationId:
            staff.assignedSubstation
        }
      },

      {
        new: true
      }
    ).lean();

  if (!updated) {
    throw new Error(
      "Package is no longer pending or does not exist."
    );
  }

  return updated;
}


// =========================================================
// DELIVER PACKAGE
// =========================================================
//
// When delivery occurs:
//
// Product.units
//     -> REDUCE
//
// Product.substationUnits
//     -> REDUCE when the field exists
//
// Substation.productInventory[].units
//     -> REDUCE
//
// Substation.productReductions[].unitsReduced
//     -> INCREASE / CREATE
//
// Package
//     -> Mark delivered
//
// DeliveredPackage
//     -> Create / update
//
// Everything runs inside ONE transaction.
// =========================================================

async function deliverPackage(
  req,
  id
) {
  if (
    roleOf(req) !==
    "staff"
  ) {
    throw new Error(
      "Only staff can mark packages as delivered."
    );
  }

  const staffId =
    staffIdOf(req);

  const staffName =
    String(
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

        // =================================================
        // GET STAFF
        // =================================================

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

        if (
          !staff.assignedSubstation
        ) {
          throw new Error(
            "You must have an assigned substation before delivering packages."
          );
        }


        // =================================================
        // GET PACKAGE
        // =================================================

        const pkg =
          await Package.findOne({
            _id: id,

            status:
              "confirmed",

            confirmedByStaffId:
              staffId
          })
            .session(
              dbSession
            );

        if (!pkg) {
          throw new Error(
            "Only the staff member who confirmed this package can deliver it."
          );
        }


        // =================================================
        // DUPLICATE DELIVERY PROTECTION
        // =================================================

        if (
          pkg.substationReductionRecorded
        ) {
          throw new Error(
            "Inventory for this package has already been reduced."
          );
        }


        // =================================================
        // GET SUBSTATION
        // =================================================

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
            !Number.isInteger(
              qty
            ) ||
            qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${item.name}.`
            );
          }


          // ===============================================
          // FIND PRODUCT
          // ===============================================

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


          // ===============================================
          // PRODUCT.UNITS
          // ===============================================
          //
          // Delivery MUST reduce Product.units.
          // ===============================================

          const productUnits =
            Number(
              product.units || 0
            );

          if (
            productUnits <
            qty
          ) {
            throw new Error(
              `Product "${item.name}" has only ${productUnits} units, but this package requires ${qty}.`
            );
          }


          // ===============================================
          // PRODUCT.SUBSTATIONUNITS
          // ===============================================

          const hasSubstationUnits =
            product.substationUnits !==
              undefined &&
            product.substationUnits !==
              null;


          let substationUnits =
            null;

          if (
            hasSubstationUnits
          ) {

            substationUnits =
              Number(
                product.substationUnits ||
                0
              );

            if (
              substationUnits <
              qty
            ) {
              throw new Error(
                `Product "${item.name}" has only ${substationUnits} substation units, but this package requires ${qty}.`
              );
            }
          }


          // ===============================================
          // FIND SUBSTATION INVENTORY
          // ===============================================

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
            inventoryUnits <
            qty
          ) {
            throw new Error(
              `${substation.name} has only ${inventoryUnits} units of ${item.name}, but this package requires ${qty}.`
            );
          }


          // ===============================================
          // UPDATE PRODUCT.UNITS
          // ===============================================

          product.units =
            productUnits -
            qty;


          // ===============================================
          // UPDATE PRODUCT.SUBSTATIONUNITS
          // ===============================================

          if (
            hasSubstationUnits
          ) {

            product.substationUnits =
              substationUnits -
              qty;
          }


          // ===============================================
          // SAVE PRODUCT
          // ===============================================

          await product.save({
            session:
              dbSession
          });


          // ===============================================
          // UPDATE SUBSTATION INVENTORY
          // ===============================================

          inventory.units =
            inventoryUnits -
            qty;

          inventory.updatedAt =
            new Date();


          // ===============================================
          // UPDATE SUBSTATION PRODUCT REDUCTIONS
          // ===============================================

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
                reduction.unitsReduced ||
                0
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

            substation.productReductions.push(
              {
                productId:
                  item.productId,

                productName:
                  item.name,

                category:
                  item.category ||
                  "",

                unitsReduced:
                  qty,

                lastReducedAt:
                  new Date()
              }
            );
          }
        }


        // =================================================
        // SAVE SUBSTATION
        // =================================================

        await substation.save({
          session:
            dbSession
        });


        // =================================================
        // MARK PACKAGE DELIVERED
        // =================================================

        pkg.status =
          "delivered";

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
          session:
            dbSession
        });


        // =================================================
        // GET CLIENT
        // =================================================

        const client =
          await User.findById(
            pkg.clientId
          )
            .select(
              "name"
            )
            .session(
              dbSession
            )
            .lean();


        // =================================================
        // CREATE / UPDATE DELIVERED PACKAGE
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
                      item.category ||
                      "",

                    price:
                      item.price,

                    qty:
                      item.qty,

                    image:
                      item.image ||
                      "",

                    substationId:
                      staff.assignedSubstation
                  })
                ),

              clientName:
                client?.name ||
                String(
                  pkg.clientId
                ),

              staffName,

              substationId:
                staff.assignedSubstation,

              amountPaid:
                Number(
                  pkg.paidAmount ||
                  0
                ),

              arrearsAmount:
                Math.max(
                  0,
                  Number(
                    pkg.totalAmount ||
                    0
                  ) -
                  Number(
                    pkg.paidAmount ||
                    0
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
// RECORD PAYMENT
// =========================================================

async function recordPayment(
  req,
  id,
  amount
) {
  const role =
    roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Staff or admin access required."
    );
  }

  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount < 0
  ) {
    throw new Error(
      "Amount paid must be a valid non-negative number."
    );
  }

  const pkg =
    await Package.findById(
      id
    );

  if (!pkg) {
    throw new Error(
      "Package not found."
    );
  }

  if (
    pkg.status !==
    "delivered"
  ) {
    throw new Error(
      "Amount paid can only be entered after delivery."
    );
  }

  if (
    role === "staff" &&
    String(
      pkg.deliveredByStaffId ||
      ""
    ) !==
      staffIdOf(req)
  ) {
    throw new Error(
      "Only the staff member who delivered this package can record its payment."
    );
  }

  if (
    numericAmount >
    Number(
      pkg.totalAmount || 0
    )
  ) {
    throw new Error(
      "Amount paid cannot exceed the package total."
    );
  }

  pkg.paidAmount =
    numericAmount;

  pkg.paymentStatus =
    numericAmount >=
    Number(
      pkg.totalAmount || 0
    )
      ? "paid"
      : numericAmount > 0
        ? "partialPaid"
        : "unpaid";

  await pkg.save();

  await DeliveredPackage.findOneAndUpdate(
    {
      packageId:
        pkg._id
    },

    {
      amountPaid:
        numericAmount,

      arrearsAmount:
        Math.max(
          0,
          Number(
            pkg.totalAmount || 0
          ) -
          numericAmount
        )
    },

    {
      new: true
    }
  );

  return pkg;
}


// =========================================================
// CONFIRM PACKAGE PAYMENT
// =========================================================

async function confirmPackagePayment(
  paymentId
) {
  const dbSession =
    await mongoose.startSession();

  let packageDoc;

  try {

    await dbSession.withTransaction(
      async () => {

        const payment =
          await Payment.findOne({
            _id: paymentId,

            status:
              "confirmed",

            packageId: {
              $ne: null
            }
          })
            .session(
              dbSession
            );

        if (!payment) {
          return;
        }

        const packageDocQuery =
          await Package.findOne({
            _id:
              payment.packageId,

            clientId:
              payment.clientId
          })
            .session(
              dbSession
            );

        if (!packageDocQuery) {
          throw new Error(
            "The package linked to this M-Pesa payment no longer exists."
          );
        }

        const totalPaid =
          await getConfirmedPaymentTotal(
            packageDocQuery._id,
            dbSession
          );

        const totalAmount =
          Math.max(
            0,
            Number(
              packageDocQuery.totalAmount ||
              0
            )
          );

        const cappedPaid =
          Math.min(
            totalPaid,
            totalAmount
          );

        packageDocQuery.paymentMethod =
          "mpesa";

        packageDocQuery.paidAmount =
          cappedPaid;

        packageDocQuery.paymentStatus =
          getPaymentStatus(
            totalAmount,
            cappedPaid
          );

        packageDocQuery.mpesaReceiptNumber =
          payment.mpesaReceiptNumber ||
          packageDocQuery.mpesaReceiptNumber ||
          "";

        packageDocQuery.phoneNumber =
          payment.phoneNumber ||
          packageDocQuery.phoneNumber ||
          "";

        await packageDocQuery.save({
          session:
            dbSession
        });

        packageDoc =
          packageDocQuery;
      }
    );

    return packageDoc;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// RELEASE PAYMENT RESERVATION
// =========================================================

async function releasePaymentReservation(
  payment
) {
  const dbSession =
    await mongoose.startSession();

  try {

    await dbSession.withTransaction(
      async () => {

        for (
          const item of
          payment.cartItems || []
        ) {

          await Product.findByIdAndUpdate(
            item.productId,

            {
              $inc: {
                units:
                  Number(
                    item.qty || 0
                  )
              }
            },

            {
              session:
                dbSession
            }
          );
        }


        const cart =
          await Cart.findOne({
            sessionId:
              payment.sessionId,

            user:
              payment.clientId
          })
            .session(
              dbSession
            );

        if (!cart) {
          return;
        }


        for (
          const failedItem of
          payment.cartItems || []
        ) {

          const current =
            cart.items.find(
              (item) =>
                String(
                  item.productId
                ) ===
                String(
                  failedItem.productId
                )
            );

          if (!current) {
            continue;
          }

          current.qty -=
            Number(
              failedItem.qty || 0
            );

          if (
            current.qty <= 0
          ) {

            cart.items =
              cart.items.filter(
                (item) =>
                  String(
                    item.productId
                  ) !==
                  String(
                    failedItem.productId
                  )
              );
          }
        }


        if (
          cart.items.length
        ) {

          await cart.save({
            session:
              dbSession
          });

        } else {

          await Cart.deleteOne(
            {
              _id: cart._id
            },
            {
              session:
                dbSession
            }
          );
        }
      }
    );

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

  getPaymentStatus,

  getConfirmedPaymentTotal,

  createPackageFromCart,

  createPackageFromPayment,

  getUserPackages,

  getUserPackage,

  getStaffPackages,

  getStaffPackage,

  confirmPackage,

  deliverPackage,

  recordPayment,

  confirmPackagePayment,

  releasePaymentReservation
};