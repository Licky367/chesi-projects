// =========================================================
// verrah/services/packageCreationService.js
//
// VERRAH COSMETICS
// PACKAGE CREATION SERVICE
//
// IMPORTANT PACKAGE RULE:
//
// Once a package is created, its product details are
// SNAPSHOTS.
//
// Existing packages NEVER read the current Product price
// to determine what was charged.
//
// Example:
//
// Product price at checkout:
//     500
//
// Package item price:
//     500
//
// Product price changed later:
//     600
//
// Existing package item price:
//     STILL 500
//
// A new package created after the change:
//     600
//
// =========================================================

const mongoose = require("mongoose");

const Cart = require("../../models/carts");
const Package = require("../../models/package");
const Payment = require("../../models/Payment");
const Product = require("../../models/products");

const {
  getClient,
  normalizePhone,
  normalizeSalesName
} = require("./packageHelpers");

const {
  getUserId
} = require("../shopContext");


// =========================================================
// HELPER
// CREATE IMMUTABLE PRODUCT SNAPSHOT
//
// This creates the exact product information that is stored
// inside the package.
//
// IMPORTANT:
//
// packageItem.price is the price charged at package creation.
// It is NOT linked dynamically to Product.unitSellPrice.
//
// =========================================================

function createProductSnapshot({
  productId,
  source,
  item,
  fallbackPrice
}) {
  if (!productId) {
    throw new Error(
      `Product information is missing for ${item?.name || "an item"}.`
    );
  }

  const qty = Number(
    item?.qty || 0
  );

  // ---------------------------------------------------------
  // PRICE
  //
  // Prefer the price already captured in the cart/payment.
  //
  // The cart/payment price represents the price shown to the
  // customer when the item was selected/paid.
  //
  // We copy that number into the package.
  //
  // We do NOT store a reference such as:
  //
  // price: source.unitSellPrice
  //
  // and we never recalculate the package later.
  // ---------------------------------------------------------

  const itemPrice =
    item?.price !== undefined &&
    item?.price !== null
      ? Number(item.price)
      : Number(fallbackPrice || 0);


  // ---------------------------------------------------------
  // NAME
  //
  // Prefer the name already captured by the cart/payment.
  // Fall back to the current product only when necessary.
  // ---------------------------------------------------------

  const name =
    item?.name ||
    source?.name ||
    "";


  // ---------------------------------------------------------
  // CATEGORY
  //
  // Capture the category value into the package.
  // ---------------------------------------------------------

  const category =
    item?.category ||
    source?.category ||
    "";


  // ---------------------------------------------------------
  // SUBCATEGORY
  //
  // Keep this as a snapshot as well.
  // ---------------------------------------------------------

  const subcategory =
    item?.subcategory ||
    source?.subcategory ||
    "";


  // ---------------------------------------------------------
  // DAYS
  //
  // Snapshot the value instead of requiring the package
  // to read Product later.
  // ---------------------------------------------------------

  const days =
    item?.days !== undefined &&
    item?.days !== null
      ? Number(item.days || 0)
      : Number(source?.days || 0);


  // ---------------------------------------------------------
  // IMAGE
  //
  // Capture the image used by the package.
  // ---------------------------------------------------------

  const image =
    item?.image ||
    source?.image ||
    "";


  // ---------------------------------------------------------
  // RETURN PACKAGE SNAPSHOT
  // ---------------------------------------------------------

  return {
    productId,

    name,

    category,

    subcategory,

    days,

    price: itemPrice,

    qty,

    image
  };
}


// =========================================================
// VALIDATE PACKAGE ITEMS
// =========================================================

function validatePackageItems(items) {
  if (
    !Array.isArray(items) ||
    !items.length
  ) {
    throw new Error(
      "The package contains no items."
    );
  }


  for (const item of items) {

    // -------------------------------------------------------
    // PRODUCT
    // -------------------------------------------------------

    if (!item.productId) {
      throw new Error(
        `Product information is missing for ${item.name || "an item"}.`
      );
    }


    // -------------------------------------------------------
    // NAME
    // -------------------------------------------------------

    if (!item.name) {
      throw new Error(
        "Product name is missing from a package item."
      );
    }


    // -------------------------------------------------------
    // QUANTITY
    // -------------------------------------------------------

    if (
      !Number.isInteger(item.qty) ||
      item.qty < 1
    ) {
      throw new Error(
        `Invalid quantity for ${item.name}.`
      );
    }


    // -------------------------------------------------------
    // PRICE
    // -------------------------------------------------------

    if (
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      throw new Error(
        `Invalid price for ${item.name}.`
      );
    }
  }
}


// =========================================================
// CALCULATE PACKAGE TOTAL
//
// IMPORTANT:
//
// Uses ONLY:
//
//     package item price × package item quantity
//
// Never uses Product.unitSellPrice here.
// =========================================================

function calculatePackageTotal(items) {
  return items.reduce(
    (sum, item) =>
      sum +
      (
        Number(item.price) *
        Number(item.qty)
      ),
    0
  );
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
            .session(dbSession);

        if (
          !cart ||
          !Array.isArray(cart.items) ||
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
        //
        // Products are fetched ONLY so we can capture
        // additional product information into the package
        // snapshot.
        //
        // The package will NOT remain dependent on these
        // product prices after creation.
        // ===============================================

        const products =
          await Product.find({
            _id: {
              $in: productIds
            }
          })
            .session(dbSession)
            .lean();


        const productMap =
          new Map(
            products.map(
              (product) => [
                String(product._id),
                product
              ]
            )
          );


        // ===============================================
        // PACKAGE ITEMS
        //
        // EVERYTHING HERE BECOMES PART OF THE PACKAGE.
        //
        // In particular:
        //
        //     price
        //
        // is copied as a NUMBER.
        //
        // It is not linked to Product.unitSellPrice.
        // ===============================================

        const items =
          cart.items.map(
            (item) => {

              const productId =
                item.productId ||
                item.product;

              const source =
                productMap.get(
                  String(productId)
                );


              return createProductSnapshot({
                productId,
                source,
                item,

                // Fallback only if the cart does not
                // already contain a price.
                fallbackPrice:
                  source?.unitSellPrice
              });
            }
          );


        // ===============================================
        // VALIDATE ITEMS
        // ===============================================

        validatePackageItems(
          items
        );


        // ===============================================
        // TOTAL
        //
        // Calculated from the SNAPSHOT prices.
        // ===============================================

        const totalAmount =
          calculatePackageTotal(
            items
          );


        // ===============================================
        // CREATE PACKAGE
        // ===============================================

        [created] =
          await Package.create(
            [
              {
                clientId,

                // -----------------------------------------
                // PRODUCT SNAPSHOTS
                // -----------------------------------------

                items,

                // -----------------------------------------
                // SNAPSHOT TOTAL
                // -----------------------------------------

                totalAmount,

                packageSubstation,

                salesName,


                // -----------------------------------------
                // PAYMENT
                // -----------------------------------------

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
              session: dbSession
            }
          );


        // ===============================================
        // CLEAR CART
        // ===============================================

        await Cart.deleteOne(
          {
            _id: cart._id,
            user: clientId
          },
          {
            session: dbSession
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

        // ===============================================
        // PAYMENT
        // ===============================================

        const payment =
          await Payment.findOne({
            _id: paymentId,
            status: "confirmed"
          })
            .session(dbSession);

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
            .session(dbSession);


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
          (payment.cartItems || [])
            .map(
              (item) =>
                item.productId
            )
            .filter(Boolean);


        // ===============================================
        // PRODUCTS
        //
        // Used only for creating the package snapshot.
        // ===============================================

        const products =
          await Product.find({
            _id: {
              $in: productIds
            }
          })
            .session(dbSession)
            .lean();


        const productMap =
          new Map(
            products.map(
              (product) => [
                String(product._id),
                product
              ]
            )
          );


        // ===============================================
        // PACKAGE ITEMS
        //
        // Payment/cart price is preserved.
        //
        // We do NOT replace it with the current
        // Product.unitSellPrice.
        // ===============================================

        const items =
          (payment.cartItems || [])
            .map(
              (item) => {

                const source =
                  productMap.get(
                    String(
                      item.productId
                    )
                  );


                return createProductSnapshot({
                  productId:
                    item.productId,

                  source,

                  item,

                  // This is ONLY a fallback.
                  //
                  // Normally payment.cartItems.price
                  // should already contain the price that
                  // the customer paid.
                  fallbackPrice:
                    source?.unitSellPrice
                });
              }
            );


        // ===============================================
        // VALIDATE ITEMS
        // ===============================================

        validatePackageItems(
          items
        );


        // ===============================================
        // TOTAL
        //
        // IMPORTANT:
        //
        // Use the package item snapshots rather than the
        // current Product prices.
        //
        // This also makes the package internally
        // consistent with its item prices.
        // ===============================================

        const calculatedTotal =
          calculatePackageTotal(
            items
          );


        // ===============================================
        // PAYMENT TOTAL
        //
        // The confirmed payment amount is normally the
        // authoritative amount for the payment itself.
        //
        // We still calculate the item total so that the
        // package's item prices remain internally
        // consistent.
        // ===============================================

        const paymentAmount =
          Number(
            payment.amount || 0
          );


        // -------------------------------------------------
        // Use the payment amount when it is valid.
        //
        // The items retain their own locked prices.
        // -------------------------------------------------

        const totalAmount =
          Number.isFinite(
            paymentAmount
          ) &&
          paymentAmount >= 0
            ? paymentAmount
            : calculatedTotal;


        // ===============================================
        // CREATE PAID PACKAGE
        // ===============================================

        [packageDoc] =
          await Package.create(
            [
              {
                clientId:
                  payment.clientId,

                // -----------------------------------------
                // LOCKED PRODUCT SNAPSHOTS
                // -----------------------------------------

                items,

                // -----------------------------------------
                // PACKAGE TOTAL
                // -----------------------------------------

                totalAmount,

                packageSubstation,

                salesName,


                // -----------------------------------------
                // PAYMENT
                // -----------------------------------------

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
              session: dbSession
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
            .session(dbSession);


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
// EXPORT
// =========================================================

module.exports = {
  createPackageFromCart,
  createPackageFromPayment
};