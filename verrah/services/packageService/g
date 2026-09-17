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
  getUserId
} = require("./shopContext");


// =========================================================
// SUBSTATION VIEW FIELDS
// =========================================================
//
// packageSubstation is the customer's selected pickup
// destination.
//
// IMPORTANT:
//
// directions is the HUMAN-READABLE directions text stored
// in the Substation document.
//
// It is NOT converted into a Google Maps URL.
//
// GPS remains separate and is passed as:
//     packageSubstation.gps
//
// Customer-facing views can therefore use:
//
//     packageSubstation.name
//     packageSubstation.location
//     packageSubstation.phoneNumber
//     packageSubstation.substationIcon
//     packageSubstation.description
//     packageSubstation.directions
//     packageSubstation.gps
//
// =========================================================

const SUBSTATION_VIEW_FIELDS =
  [
    "name",
    "location",
    "phoneNumber",
    "substationIcon",
    "description",
    "directions",
    "gps"
  ].join(" ");


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
// PHONE NORMALIZER
// =========================================================

function normalizePhone(
  phone
) {
  if (
    phone === undefined ||
    phone === null
  ) {
    return "";
  }

  const value =
    String(phone).trim();

  if (
    !value ||
    value === "_" ||
    value === "—"
  ) {
    return "";
  }

  return value;
}


// =========================================================
// SALES NAME NORMALIZER
// =========================================================

function normalizeSalesName(
  salesName
) {
  if (
    salesName === undefined ||
    salesName === null
  ) {
    return "";
  }

  const value =
    String(salesName).trim();

  if (!value) {
    return "";
  }

  if (value.length > 150) {
    throw new Error(
      "Sales name cannot exceed 150 characters."
    );
  }

  return value;
}


// =========================================================
// PREPARE SUBSTATION FOR VIEW
// =========================================================
//
// THIS FUNCTION IS IMPORTANT.
//
// It passes the Substation data to the EJS without replacing
// the human-readable `directions` field.
//
// The following remains separate:
//
//     directions
//         = human-readable stored directions
//
//     gps
//         = GPS coordinates
//
// There is NO:
//
//     directionsUrl
//
// There is NO:
//
//     directions = Google Maps URL
//
// =========================================================

function prepareSubstationForView(
  substation
) {
  if (!substation) {
    return null;
  }


  const prepared = {
    ...substation
  };


  // -------------------------------------------------------
  // HUMAN-READABLE DIRECTIONS
  // -------------------------------------------------------
  //
  // Keep the actual directions entered for the substation.
  //
  // Example:
  //
  // "From Nairobi, take Ngong Road toward Karen.
  //  Turn left at the Total station and continue for
  //  approximately 500 metres."
  //
  // This is what the EJS should receive.
  //
  // -------------------------------------------------------

  prepared.directions =
    typeof prepared.directions === "string"
      ? prepared.directions.trim()
      : (
          prepared.directions === undefined ||
          prepared.directions === null
            ? ""
            : String(
                prepared.directions
              ).trim()
        );


  // -------------------------------------------------------
  // GPS
  // -------------------------------------------------------
  //
  // GPS is deliberately left as GPS data.
  //
  // Do NOT turn it into directions text.
  // Do NOT turn it into a URL.
  //
  // -------------------------------------------------------

  if (
    prepared.gps &&
    typeof prepared.gps === "object"
  ) {

    prepared.gps = {
      ...prepared.gps
    };

  } else {

    prepared.gps = null;
  }


  return prepared;
}


// =========================================================
// PREPARE PACKAGE DESTINATION
// =========================================================
//
// Priority:
//
// 1. Package.packageSubstation
// 2. Customer User.pickupStation for older packages
//
// NEVER use:
//
//     req.user.assignedSubstation
//
// assignedSubstation belongs to staff operations and must
// never replace the customer's package destination.
//
// =========================================================

async function preparePackageDestination(
  packageDoc,
  dbSession = null
) {
  if (!packageDoc) {
    return null;
  }


  // -------------------------------------------------------
  // PACKAGE DESTINATION
  // -------------------------------------------------------

  if (
    packageDoc.packageSubstation
  ) {

    packageDoc.packageSubstation =
      prepareSubstationForView(
        packageDoc.packageSubstation
      );

    return packageDoc.packageSubstation;
  }


  // -------------------------------------------------------
  // NO CLIENT
  // -------------------------------------------------------

  if (
    !packageDoc.clientId
  ) {

    packageDoc.packageSubstation =
      null;

    return null;
  }


  // -------------------------------------------------------
  // OLD PACKAGE FALLBACK
  // -------------------------------------------------------
  //
  // Only packages without a stored packageSubstation use
  // the customer's current pickupStation.
  //
  // -------------------------------------------------------

  let query =
    User.findById(
      packageDoc.clientId
    )
      .select(
        "_id pickupStation"
      )
      .populate(
        "pickupStation",
        SUBSTATION_VIEW_FIELDS
      );


  if (dbSession) {

    query =
      query.session(
        dbSession
      );
  }


  const client =
    await query.lean();


  packageDoc.packageSubstation =
    prepareSubstationForView(
      client?.pickupStation ||
      null
    );


  return packageDoc.packageSubstation;
}


// =========================================================
// GET CLIENT
// =========================================================
//
// User.phone is authoritative for the customer's phone.
//
// pickupStation is included because it is needed for:
//
//     Package.packageSubstation
//
// when creating a package.
//
// =========================================================

async function getClient(
  clientId,
  dbSession = null
) {
  let query =
    User.findById(
      clientId
    )
      .select(
        "_id name email phone pickupStation"
      )
      .populate(
        "pickupStation",
        SUBSTATION_VIEW_FIELDS
      );


  if (dbSession) {

    query =
      query.session(
        dbSession
      );
  }


  return query.lean();
}


// =========================================================
// CREATE PACKAGE FROM CART
// =========================================================
//
// The customer's pickupStation is stored permanently as:
//
//     Package.packageSubstation
//
// This prevents a later change to User.pickupStation from
// silently changing an existing package's destination.
//
// =========================================================

async function createPackageFromCart(
  req,
  paymentData = {}
) {
  const clientId =
    getUserId(req);


  if (!clientId) {
    throw new Error(
      "Login is required."
    );
  }


  const dbSession =
    await mongoose.startSession();


  let created;


  try {

    await dbSession.withTransaction(
      async () => {

        // ===============================================
        // CLIENT
        // ===============================================

        const client =
          await getClient(
            clientId,
            dbSession
          );


        if (!client) {
          throw new Error(
            "Customer account not found."
          );
        }


        // ===============================================
        // PHONE
        // ===============================================

        const clientPhone =
          normalizePhone(
            client.phone
          );


        // ===============================================
        // CUSTOMER DESTINATION
        // ===============================================

        const packageSubstation =
          client.pickupStation?._id ||
          client.pickupStation ||
          null;


        // ===============================================
        // SALES NAME
        // ===============================================

        const salesName =
          normalizeSalesName(
            paymentData.salesName
          );


        // ===============================================
        // CART
        // ===============================================

        const cart =
          await Cart.findOne({
            user: clientId
          })
            .session(
              dbSession
            );


        if (
          !cart ||
          !Array.isArray(
            cart.items
          ) ||
          !cart.items.length
        ) {
          throw new Error(
            "Your cart is empty."
          );
        }


        // ===============================================
        // PRODUCT IDS
        // ===============================================

        const productIds =
          cart.items
            .map(
              (item) =>
                item.productId ||
                item.product
            )
            .filter(Boolean);


        // ===============================================
        // PRODUCTS
        // ===============================================

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


        // ===============================================
        // PACKAGE ITEMS
        // ===============================================

        const items =
          cart.items.map(
            (item) => {

              const productId =
                item.productId ||
                item.product;


              const source =
                productMap.get(
                  String(
                    productId
                  )
                );


              return {

                productId,

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


        // ===============================================
        // VALIDATE ITEMS
        // ===============================================

        for (
          const item of items
        ) {

          if (
            !item.productId
          ) {
            throw new Error(
              `Product information is missing for ${item.name || "an item"}.`
            );
          }


          if (
            !Number.isInteger(
              item.qty
            ) ||
            item.qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${item.name}.`
            );
          }


          if (
            !Number.isFinite(
              item.price
            ) ||
            item.price < 0
          ) {
            throw new Error(
              `Invalid price for ${item.name}.`
            );
          }
        }


        // ===============================================
        // TOTAL
        // ===============================================

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


        // ===============================================
        // CREATE PACKAGE
        // ===============================================

        [
          created
        ] =
          await Package.create(
            [
              {

                clientId,

                items,

                totalAmount,

                packageSubstation,

                salesName,

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
                  clientPhone,

                status:
                  "pending"
              }
            ],
            {
              session:
                dbSession
            }
          );


        // ===============================================
        // CLEAR CART
        // ===============================================

        await Cart.deleteOne(
          {
            _id:
              cart._id,

            user:
              clientId
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
//
// M-Pesa package creation stores the customer's
// pickupStation as packageSubstation.
//
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

        // ===============================================
        // PAYMENT
        // ===============================================

        const payment =
          await Payment.findOne({
            _id: paymentId,

            status:
              "confirmed"
          })
            .session(
              dbSession
            );


        if (!payment) {
          return;
        }


        // ===============================================
        // DUPLICATE PROTECTION
        // ===============================================

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


        // ===============================================
        // CLIENT
        // ===============================================

        const client =
          await getClient(
            payment.clientId,
            dbSession
          );


        if (!client) {
          throw new Error(
            "Customer account not found."
          );
        }


        // ===============================================
        // PHONE
        // ===============================================

        const clientPhone =
          normalizePhone(
            client.phone
          ) ||
          normalizePhone(
            payment.phoneNumber
          );


        // ===============================================
        // CUSTOMER DESTINATION
        // ===============================================

        const packageSubstation =
          client.pickupStation?._id ||
          client.pickupStation ||
          null;


        // ===============================================
        // SALES NAME
        // ===============================================

        const salesName =
          normalizeSalesName(
            payment.salesName
          );


        // ===============================================
        // PRODUCT IDS
        // ===============================================

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


        // ===============================================
        // PRODUCTS
        // ===============================================

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


        // ===============================================
        // ITEMS
        // ===============================================

        const items =
          (
            payment.cartItems ||
            []
          ).map(
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


        // ===============================================
        // VALIDATE ITEMS
        // ===============================================

        if (
          !items.length
        ) {
          throw new Error(
            "The confirmed payment contains no cart items."
          );
        }


        for (
          const item of items
        ) {

          if (
            !item.productId
          ) {
            throw new Error(
              `Product information is missing for ${item.name || "a paid item"}.`
            );
          }


          if (
            !Number.isInteger(
              item.qty
            ) ||
            item.qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${item.name}.`
            );
          }
        }


        // ===============================================
        // CREATE PAID PACKAGE
        // ===============================================

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
                  Number(
                    payment.amount || 0
                  ),

                packageSubstation,

                salesName,

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
                  clientPhone,

                status:
                  "pending"
              }
            ],
            {
              session:
                dbSession
            }
          );


        // ===============================================
        // CART
        // ===============================================

        const cart =
          await Cart.findOne({
            user:
              payment.clientId
          })
            .session(
              dbSession
            );


        if (!cart) {
          return;
        }


        // ===============================================
        // REMOVE PAID QUANTITIES
        // ===============================================

        for (
          const paidItem of
          payment.cartItems || []
        ) {

          const current =
            cart.items.find(
              (item) =>
                String(
                  item.productId ||
                  item.product
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
                    item.productId ||
                    item.product
                  ) !==
                  String(
                    paidItem.productId
                  )
              );
          }
        }


        // ===============================================
        // SAVE / DELETE CART
        // ===============================================

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
              _id:
                cart._id,

              user:
                payment.clientId
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
//
// Returns customer packages with packageSubstation fully
// populated.
//
// `directions` remains human-readable.
//
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


  const packages =
    await Package.find({
      clientId
    })
      .sort({
        createdAt: -1
      })
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  // ===============================================
  // FALLBACK PICKUP STATION
  // ===============================================

  const client =
    await User.findById(
      clientId
    )
      .select(
        "_id pickupStation"
      )
      .populate(
        "pickupStation",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  const fallbackSubstation =
    prepareSubstationForView(
      client?.pickupStation ||
      null
    );


  // ===============================================
  // PREPARE PACKAGES
  // ===============================================

  return packages.map(
    (pkg) => {

      if (
        pkg.packageSubstation
      ) {

        pkg.packageSubstation =
          prepareSubstationForView(
            pkg.packageSubstation
          );

      } else if (
        fallbackSubstation
      ) {

        pkg.packageSubstation =
          {
            ...fallbackSubstation
          };

      } else {

        pkg.packageSubstation =
          null;
      }


      return pkg;
    }
  );
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


  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    return null;
  }


  const packageDoc =
    await Package.findOne({
      _id: id,

      clientId
    })
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!packageDoc) {
    return null;
  }


  await preparePackageDestination(
    packageDoc
  );


  return packageDoc;
}


// =========================================================
// GET STAFF PACKAGES
// =========================================================
//
// packageSubstation:
//     Customer destination
//
// confirmedSubstationId:
//     Staff confirmation location
//
// deliveredSubstationId:
//     Staff delivery location
//
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


  // ===============================================
  // STAFF VISIBILITY
  // ===============================================

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


  // ===============================================
  // LOAD PACKAGES
  // ===============================================

  const allVisible =
    await Package.find(
      visibleQuery
    )
      .sort({
        createdAt: -1
      })
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "deliveredSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  // ===============================================
  // PREPARE SUBSTATIONS
  // ===============================================

  allVisible.forEach(
    (pkg) => {

      if (
        pkg.packageSubstation
      ) {

        pkg.packageSubstation =
          prepareSubstationForView(
            pkg.packageSubstation
          );
      }


      if (
        pkg.confirmedSubstationId
      ) {

        pkg.confirmedSubstationId =
          prepareSubstationForView(
            pkg.confirmedSubstationId
          );
      }


      if (
        pkg.deliveredSubstationId
      ) {

        pkg.deliveredSubstationId =
          prepareSubstationForView(
            pkg.deliveredSubstationId
          );
      }
    }
  );


  // ===============================================
  // COUNTS
  // ===============================================

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


  // ===============================================
  // STATUS FILTER
  // ===============================================

  const packages =
    status === "all"
      ? allVisible
      : allVisible.filter(
          (p) =>
            p.status ===
            status
        );


  // ===============================================
  // CLIENT IDS
  // ===============================================

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


  // ===============================================
  // CLIENTS
  // ===============================================

  const clients =
    await User.find({
      _id: {
        $in: clientIds
      }
    })
      .select(
        "_id name email phone"
      )
      .lean();


  const clientMap =
    new Map(
      clients.map(
        (client) => [

          String(
            client._id
          ),

          {
            ...client,

            phone:
              normalizePhone(
                client.phone
              )
          }
        ]
      )
    );


  // ===============================================
  // RETURN
  // ===============================================

  return {

    packages:
      packages.map(
        (pkg) => {

          const client =
            clientMap.get(
              String(
                pkg.clientId
              )
            ) || null;


          if (
            client
          ) {

            client.phone =
              normalizePhone(
                client.phone
              ) ||
              normalizePhone(
                pkg.phoneNumber
              );
          }


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


  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    return null;
  }


  const pkg =
    await Package.findById(
      id
    )
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "deliveredSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!pkg) {
    return null;
  }


  // ===============================================
  // STAFF VISIBILITY
  // ===============================================

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
      ) !==
        staffId
    ) {
      return null;
    }
  }


  // ===============================================
  // DESTINATION
  // ===============================================

  await preparePackageDestination(
    pkg
  );


  // ===============================================
  // CONFIRMED SUBSTATION
  // ===============================================

  if (
    pkg.confirmedSubstationId
  ) {

    pkg.confirmedSubstationId =
      prepareSubstationForView(
        pkg.confirmedSubstationId
      );
  }


  // ===============================================
  // DELIVERED SUBSTATION
  // ===============================================

  if (
    pkg.deliveredSubstationId
  ) {

    pkg.deliveredSubstationId =
      prepareSubstationForView(
        pkg.deliveredSubstationId
      );
  }


  // ===============================================
  // CLIENT
  // ===============================================

  const client =
    await User.findById(
      pkg.clientId
    )
      .select(
        "_id name email phone"
      )
      .lean();


  if (client) {

    client.phone =
      normalizePhone(
        client.phone
      ) ||
      normalizePhone(
        pkg.phoneNumber
      );
  }


  // ===============================================
  // RETURN
  // ===============================================

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
//
// Staff assignedSubstation is operational information.
//
// It is saved as:
//
//     confirmedSubstationId
//
// It NEVER replaces:
//
//     packageSubstation
//
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

        status:
          "pending"
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
    )
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!updated) {
    throw new Error(
      "Package is no longer pending or does not exist."
    );
  }


  // ===============================================
  // PREPARE CUSTOMER DESTINATION
  // ===============================================

  await preparePackageDestination(
    updated
  );


  // ===============================================
  // PREPARE CONFIRMATION SUBSTATION
  // ===============================================

  if (
    updated.confirmedSubstationId
  ) {

    updated.confirmedSubstationId =
      prepareSubstationForView(
        updated.confirmedSubstationId
      );
  }


  return updated;
}


// =========================================================
// DELIVER PACKAGE
// =========================================================
//
// Staff assignedSubstation is used for inventory and
// operational delivery.
//
// packageSubstation remains the customer's destination.
//
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


        if (
          !staff.assignedSubstation
        ) {
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


        // =============================================
        // DUPLICATE PROTECTION
        // =============================================

        if (
          pkg.substationReductionRecorded
        ) {
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


          // -------------------------------------------
          // PRODUCT SUBSTATION UNITS
          // -------------------------------------------

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


          // -------------------------------------------
          // SUBSTATION INVENTORY
          // -------------------------------------------

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


          // -------------------------------------------
          // REDUCE PRODUCT
          // -------------------------------------------

          product.units =
            productUnits -
            qty;


          if (
            hasSubstationUnits
          ) {

            product.substationUnits =
              substationUnits -
              qty;
          }


          await product.save({
            session:
              dbSession
          });


          // -------------------------------------------
          // REDUCE SUBSTATION INVENTORY
          // -------------------------------------------

          inventory.units =
            inventoryUnits -
            qty;


          inventory.updatedAt =
            new Date();


          // -------------------------------------------
          // PRODUCT REDUCTIONS
          // -------------------------------------------

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


        // =============================================
        // SAVE SUBSTATION
        // =============================================

        await substation.save({
          session:
            dbSession
        });


        // =============================================
        // MARK PACKAGE DELIVERED
        // =============================================

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


  // -------------------------------------------------------
  // Return package with customer destination populated.
  // -------------------------------------------------------

  const result =
    await Package.findById(
      pkg._id
    )
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (result) {

    await preparePackageDestination(
      result
    );

    return result;
  }


  return pkg;
}


// =========================================================
// CONFIRM PACKAGE PAYMENT
// =========================================================
//
// Payment confirmation updates payment information while
// preserving packageSubstation.
//
// Existing packageSubstation is NEVER replaced.
//
// Older packages without packageSubstation receive the
// customer's pickupStation.
//
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

        // =============================================
        // PAYMENT
        // =============================================

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


        // =============================================
        // PACKAGE
        // =============================================

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


        // =============================================
        // PAYMENT TOTAL
        // =============================================

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


        // =============================================
        // CLIENT
        // =============================================

        const client =
          await getClient(
            packageDocQuery.clientId,
            dbSession
          );


        // =============================================
        // PHONE
        // =============================================

        const clientPhone =
          normalizePhone(
            client?.phone
          );


        if (
          clientPhone
        ) {

          packageDocQuery.phoneNumber =
            clientPhone;

        } else {

          packageDocQuery.phoneNumber =
            normalizePhone(
              payment.phoneNumber
            ) ||
            normalizePhone(
              packageDocQuery.phoneNumber
            );
        }


        // =============================================
        // SALES NAME
        // =============================================

        const paymentSalesName =
          normalizeSalesName(
            payment.salesName
          );


        if (
          paymentSalesName
        ) {

          packageDocQuery.salesName =
            paymentSalesName;

        } else {

          packageDocQuery.salesName =
            normalizeSalesName(
              packageDocQuery.salesName
            );
        }


        // =============================================
        // PACKAGE DESTINATION
        // =============================================
        //
        // Never replace an existing destination.
        //
        // Only old packages without a destination receive
        // the customer's pickupStation.
        //
        // =============================================

        if (
          !packageDocQuery.packageSubstation &&
          client?.pickupStation
        ) {

          packageDocQuery.packageSubstation =
            client.pickupStation._id ||
            client.pickupStation;
        }


        await packageDocQuery.save({
          session:
            dbSession
        });


        packageDoc =
          packageDocQuery;
      }
    );


    // -------------------------------------------------------
    // Re-fetch the package after the transaction so the EJS
    // receives the complete populated destination.
    // -------------------------------------------------------

    if (packageDoc?._id) {

      const populated =
        await Package.findById(
          packageDoc._id
        )
          .populate(
            "packageSubstation",
            SUBSTATION_VIEW_FIELDS
          )
          .lean();


      if (populated) {

        await preparePackageDestination(
          populated
        );


        packageDoc =
          populated;
      }
    }


    return packageDoc;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// RELEASE PAYMENT RESERVATION
// =========================================================
//
// There is no inventory reservation.
//
// Starting M-Pesa payment does not reduce inventory.
//
// Failed/cancelled payment:
//
//     Product.units unchanged
//     Cart unchanged
//     Cart remains available
//
// =========================================================

async function releasePaymentReservation(
  payment
) {
  return;
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