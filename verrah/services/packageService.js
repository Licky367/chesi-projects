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
// packageSubstation is the CUSTOMER'S selected destination.
//
// These fields are deliberately included because the
// customer-facing package views need destination information,
// contact information, description, icon and GPS.
//
// Staff assignedSubstation is NOT used here.
// =========================================================

const SUBSTATION_VIEW_FIELDS =
  "name location phoneNumber description substationIcon gps";


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
// GPS VALUE
// =========================================================
//
// Accepts common numeric representations.
//
// Example:
//
// gps: {
//     latitude: -1.286389,
//     longitude: 36.817223
// }
//
// The service does not invent coordinates.
// It only creates directions when valid coordinates exist.
// =========================================================

function getGpsCoordinates(
  gps
) {
  if (
    !gps ||
    typeof gps !== "object"
  ) {
    return null;
  }

  const latitude =
    Number(
      gps.latitude ??
      gps.lat
    );

  const longitude =
    Number(
      gps.longitude ??
      gps.lng ??
      gps.lon
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}


// =========================================================
// CREATE DIRECTIONS URL
// =========================================================
//
// The destination is the package/customer substation.
//
// This produces a Google Maps directions URL which can be
// used directly by the EJS:
//
//     packageSubstation.directions
//
// or:
//
//     packageSubstation.directionsUrl
//
// The destination is represented by GPS coordinates so the
// link points directly to the substation coordinates.
// =========================================================

function createDirectionsUrl(
  gps
) {
  const coordinates =
    getGpsCoordinates(
      gps
    );

  if (!coordinates) {
    return "";
  }

  const destination =
    encodeURIComponent(
      `${coordinates.latitude},${coordinates.longitude}`
    );

  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${destination}` +
    "&travelmode=driving"
  );
}


// =========================================================
// CREATE GOOGLE MAPS LOCATION URL
// =========================================================
//
// This opens the exact coordinate on Google Maps.
//
// Directions and location links are deliberately exposed
// separately.
// =========================================================

function createGoogleMapsUrl(
  gps
) {
  const coordinates =
    getGpsCoordinates(
      gps
    );

  if (!coordinates) {
    return "";
  }

  const destination =
    encodeURIComponent(
      `${coordinates.latitude},${coordinates.longitude}`
    );

  return (
    "https://www.google.com/maps/search/?api=1" +
    `&query=${destination}`
  );
}


// =========================================================
// PREPARE SUBSTATION FOR VIEW
// =========================================================
//
// This is the important bridge between MongoDB data and the
// EJS views.
//
// The view receives one complete packageSubstation object.
//
// It includes the original database information plus:
//
//     directions
//     directionsUrl
//     googleMapsUrl
//
// `directions` is intentionally provided as an alias of the
// directions URL so existing views can use either:
//
//     packageSubstation.directions
//
// or:
//
//     packageSubstation.directionsUrl
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
  // GPS
  // -------------------------------------------------------

  const coordinates =
    getGpsCoordinates(
      prepared.gps
    );


  if (coordinates) {

    // Preserve the original GPS object while ensuring
    // latitude and longitude are readily available.

    prepared.gps = {
      ...prepared.gps,

      latitude:
        coordinates.latitude,

      longitude:
        coordinates.longitude
    };

  } else {

    prepared.gps =
      prepared.gps || null;
  }


  // -------------------------------------------------------
  // DIRECTIONS
  // -------------------------------------------------------

  const directionsUrl =
    createDirectionsUrl(
      prepared.gps
    );


  prepared.directionsUrl =
    directionsUrl;


  prepared.directions =
    directionsUrl;


  // -------------------------------------------------------
  // GOOGLE MAPS LOCATION
  // -------------------------------------------------------

  prepared.googleMapsUrl =
    createGoogleMapsUrl(
      prepared.gps
    );


  return prepared;
}


// =========================================================
// PREPARE PACKAGE DESTINATION
// =========================================================
//
// Ensures the package destination is always prepared before
// reaching the view.
//
// Priority:
//
// 1. Package.packageSubstation
// 2. Customer User.pickupStation
//
// NEVER:
//
// req.user.assignedSubstation
// =========================================================

async function preparePackageDestination(
  packageDoc,
  dbSession = null
) {
  if (!packageDoc) {
    return null;
  }


  // -------------------------------------------------------
  // EXISTING PACKAGE SUBSTATION
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
  // Older packages may not contain packageSubstation.
  //
  // Use the customer's pickupStation only in this situation.
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
// Includes pickupStation because it is required when a new
// package is created.
//
// User.phone remains the authoritative customer phone.
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
// Customer destination:
//
//     User.pickupStation
//
// is stored permanently as:
//
//     Package.packageSubstation
//
// This means changing the customer's pickup station later
// does not silently change the destination of an existing
// package.
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

        // -------------------------------------------------
        // GET CLIENT
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CUSTOMER PHONE
        // -------------------------------------------------

        const clientPhone =
          normalizePhone(
            client.phone
          );


        // -------------------------------------------------
        // CUSTOMER DESTINATION
        // -------------------------------------------------
        //
        // pickupStation is the customer's selected
        // destination.
        // -------------------------------------------------

        const packageSubstation =
          client.pickupStation?._id ||
          client.pickupStation ||
          null;


        // -------------------------------------------------
        // SALES NAME
        // -------------------------------------------------

        const salesName =
          normalizeSalesName(
            paymentData.salesName
          );


        // -------------------------------------------------
        // FIND CART
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PRODUCT IDS
        // -------------------------------------------------

        const productIds =
          cart.items
            .map(
              (item) =>
                item.productId ||
                item.product
            )
            .filter(Boolean);


        // -------------------------------------------------
        // PRODUCTS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PACKAGE ITEMS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // VALIDATE ITEMS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // TOTAL
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CREATE PACKAGE
        // -------------------------------------------------

        [
          created
        ] =
          await Package.create(
            [
              {

                clientId,

                items,

                totalAmount,

                // Customer-selected destination
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


        // -------------------------------------------------
        // CLEAR CART
        // -------------------------------------------------

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
// M-Pesa package creation also stores the customer's
// pickupStation in Package.packageSubstation.
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

        // -------------------------------------------------
        // PAYMENT
        // -------------------------------------------------

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


        // -------------------------------------------------
        // DUPLICATE PROTECTION
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CLIENT
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PHONE
        // -------------------------------------------------

        const clientPhone =
          normalizePhone(
            client.phone
          ) ||
          normalizePhone(
            payment.phoneNumber
          );


        // -------------------------------------------------
        // CUSTOMER DESTINATION
        // -------------------------------------------------

        const packageSubstation =
          client.pickupStation?._id ||
          client.pickupStation ||
          null;


        // -------------------------------------------------
        // SALES NAME
        // -------------------------------------------------

        const salesName =
          normalizeSalesName(
            payment.salesName
          );


        // -------------------------------------------------
        // PRODUCT IDS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PRODUCTS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // ITEMS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // VALIDATE ITEMS
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CREATE PAID PACKAGE
        // -------------------------------------------------

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

                // Customer destination
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


        // -------------------------------------------------
        // CART
        // -------------------------------------------------

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


        // -------------------------------------------------
        // REMOVE PAID QUANTITIES
        // -------------------------------------------------

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


        // -------------------------------------------------
        // SAVE / DELETE CART
        // -------------------------------------------------

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
// Every package returned to the customer receives a fully
// prepared packageSubstation object.
//
// Directions are generated before the data reaches the EJS.
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


  // -------------------------------------------------------
  // CUSTOMER FALLBACK DESTINATION
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // PREPARE EVERY PACKAGE
  // -------------------------------------------------------

  return packages.map(
    (pkg) => {

      if (
        pkg.packageSubstation
      ) {

        pkg.packageSubstation =
          prepareSubstationForView(
            pkg.packageSubstation
          );

      } else {

        pkg.packageSubstation =
          fallbackSubstation
            ? {
                ...fallbackSubstation
              }
            : null;
      }


      return pkg;
    }
  );
}


// =========================================================
// GET USER PACKAGE
// =========================================================
//
// Customer destination:
//
//     package.packageSubstation
//
// Older-package fallback:
//
//     User.pickupStation
//
// Directions are attached to packageSubstation before the
// object is returned to the controller/view.
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
//
//     Customer destination
//
// confirmedSubstationId:
//
//     Staff confirmation location
//
// deliveredSubstationId:
//
//     Staff delivery location
//
// All three are populated with the information required by
// the relevant views, including GPS and directions.
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


  // -------------------------------------------------------
  // PREPARE SUBSTATION DATA
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // COUNTS
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // FILTER
  // -------------------------------------------------------

  const packages =
    status === "all"
      ? allVisible
      : allVisible.filter(
          (p) =>
            p.status ===
            status
        );


  // -------------------------------------------------------
  // CLIENT IDS
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // CLIENTS
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // RETURN
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // STAFF VISIBILITY
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // PREPARE ALL SUBSTATION DATA
  // -------------------------------------------------------

  await preparePackageDestination(
    pkg
  );


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


  // -------------------------------------------------------
  // CLIENT
  // -------------------------------------------------------

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
// IMPORTANT:
//
// Staff assignedSubstation is operational data only.
//
// It becomes:
//
//     confirmedSubstationId
//
// It does NOT overwrite:
//
//     packageSubstation
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


  // -------------------------------------------------------
  // PREPARE DESTINATION DATA
  // -------------------------------------------------------

  await preparePackageDestination(
    updated
  );


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
        // STAFF
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
        // PACKAGE
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
        // DUPLICATE PROTECTION
        // =================================================

        if (
          pkg.substationReductionRecorded
        ) {
          throw new Error(
            "Inventory for this package has already been reduced."
          );
        }


        // =================================================
        // STAFF OPERATIONAL SUBSTATION
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
        // PROCESS ITEMS
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
          // PRODUCT
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
          // SUBSTATION INVENTORY
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
          // REDUCE PRODUCT
          // ===============================================

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


          // ===============================================
          // REDUCE SUBSTATION INVENTORY
          // ===============================================

          inventory.units =
            inventoryUnits -
            qty;


          inventory.updatedAt =
            new Date();


          // ===============================================
          // PRODUCT REDUCTIONS
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
        // DELIVERED PACKAGE
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
//
// Payment confirmation updates payment information while
// preserving the package destination.
//
// If an older package has no packageSubstation, the
// customer's pickupStation is used.
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

        // -------------------------------------------------
        // PAYMENT
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PACKAGE
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PAYMENT TOTAL
        // -------------------------------------------------

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


        // -------------------------------------------------
        // CLIENT
        // -------------------------------------------------

        const client =
          await getClient(
            packageDocQuery.clientId,
            dbSession
          );


        // -------------------------------------------------
        // PHONE
        // -------------------------------------------------

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


        // -------------------------------------------------
        // SALES NAME
        // -------------------------------------------------

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


        // -------------------------------------------------
        // PACKAGE DESTINATION
        // -------------------------------------------------
        //
        // Never replace an existing package destination.
        //
        // Only older packages without one receive the
        // customer's pickupStation.
        // -------------------------------------------------

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


    return packageDoc;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// RELEASE PAYMENT RESERVATION
// =========================================================
//
// There is NO inventory reservation.
//
// Starting M-Pesa payment does not reduce inventory.
//
// Failed/cancelled payment:
//
// - Product.units unchanged
// - Cart unchanged
// - Cart remains available
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