// =========================================================
// verrah/services/packageCreationService.js
//
// VERRAH COSMETICS
// PACKAGE CREATION SERVICE
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
// CREATE PACKAGE FROM CART
// =========================================================

async function createPackageFromCart(req, paymentData = {}) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  const dbSession = await mongoose.startSession();

  let created;

  try {
    await dbSession.withTransaction(async () => {

      // ===============================================
      // CLIENT
      // ===============================================

      const client = await getClient(
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

      const clientPhone = normalizePhone(
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

      const salesName = normalizeSalesName(
        paymentData.salesName
      );


      // ===============================================
      // CART
      // ===============================================

      const cart = await Cart.findOne({
        user: clientId
      })
        .session(dbSession);

      if (
        !cart ||
        !Array.isArray(cart.items) ||
        !cart.items.length
      ) {
        throw new Error("Your cart is empty.");
      }


      // ===============================================
      // PRODUCT IDS
      // ===============================================

      const productIds = cart.items
        .map(
          (item) =>
            item.productId ||
            item.product
        )
        .filter(Boolean);


      // ===============================================
      // PRODUCTS
      // ===============================================

      const products = await Product.find({
        _id: {
          $in: productIds
        }
      })
        .session(dbSession)
        .lean();

      const productMap = new Map(
        products.map(
          (product) => [
            String(product._id),
            product
          ]
        )
      );


      // ===============================================
      // PACKAGE ITEMS
      // ===============================================

      const items = cart.items.map((item) => {
        const productId =
          item.productId ||
          item.product;

        const source = productMap.get(
          String(productId)
        );

        return {
          productId,

          name: item.name,

          category:
            source?.category || "",

          subcategory:
            source?.subcategory || "",

          days:
            Number(source?.days || 0),

          price:
            Number(item.price || 0),

          qty:
            Number(item.qty || 0),

          image:
            item.image || ""
        };
      });


      // ===============================================
      // VALIDATE ITEMS
      // ===============================================

      for (const item of items) {
        if (!item.productId) {
          throw new Error(
            `Product information is missing for ${item.name || "an item"}.`
          );
        }

        if (
          !Number.isInteger(item.qty) ||
          item.qty < 1
        ) {
          throw new Error(
            `Invalid quantity for ${item.name}.`
          );
        }

        if (
          !Number.isFinite(item.price) ||
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

      const totalAmount = items.reduce(
        (sum, item) =>
          sum +
          item.price *
          item.qty,
        0
      );


      // ===============================================
      // CREATE PACKAGE
      // ===============================================

      [created] =
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
    });

    return created;

  } finally {
    await dbSession.endSession();
  }
}


// =========================================================
// CREATE PACKAGE FROM PAYMENT
// =========================================================

async function createPackageFromPayment(paymentId) {
  const dbSession = await mongoose.startSession();

  let packageDoc;

  try {
    await dbSession.withTransaction(async () => {

      // ===============================================
      // PAYMENT
      // ===============================================

      const payment = await Payment.findOne({
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

      const existing = await Package.findOne({
        clientId: payment.clientId,
        paymentMethod: "mpesa",
        mpesaReceiptNumber:
          payment.mpesaReceiptNumber
      })
        .session(dbSession);

      if (existing) {
        packageDoc = existing;
        return;
      }


      // ===============================================
      // CLIENT
      // ===============================================

      const client = await getClient(
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
        normalizePhone(client.phone) ||
        normalizePhone(payment.phoneNumber);


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

      const salesName = normalizeSalesName(
        payment.salesName
      );


      // ===============================================
      // PRODUCT IDS
      // ===============================================

      const productIds =
        (payment.cartItems || [])
          .map(
            (item) => item.productId
          )
          .filter(Boolean);


      // ===============================================
      // PRODUCTS
      // ===============================================

      const products = await Product.find({
        _id: {
          $in: productIds
        }
      })
        .session(dbSession)
        .lean();

      const productMap = new Map(
        products.map(
          (product) => [
            String(product._id),
            product
          ]
        )
      );


      // ===============================================
      // ITEMS
      // ===============================================

      const items =
        (payment.cartItems || [])
          .map((item) => {
            const source =
              productMap.get(
                String(item.productId)
              );

            return {
              productId:
                item.productId,

              name:
                item.name,

              category:
                source?.category || "",

              subcategory:
                source?.subcategory || "",

              days:
                Number(source?.days || 0),

              price:
                Number(item.price || 0),

              qty:
                Number(item.qty || 0),

              image:
                item.image || ""
            };
          });


      // ===============================================
      // VALIDATE ITEMS
      // ===============================================

      if (!items.length) {
        throw new Error(
          "The confirmed payment contains no cart items."
        );
      }

      for (const item of items) {
        if (!item.productId) {
          throw new Error(
            `Product information is missing for ${item.name || "a paid item"}.`
          );
        }

        if (
          !Number.isInteger(item.qty) ||
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

      [packageDoc] =
        await Package.create(
          [
            {
              clientId:
                payment.clientId,

              items,

              totalAmount:
                Number(payment.amount || 0),

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
            session: dbSession
          }
        );


      // ===============================================
      // CART
      // ===============================================

      const cart = await Cart.findOne({
        user: payment.clientId
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
        const current = cart.items.find(
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

        current.qty -= Number(
          paidItem.qty || 0
        );

        if (current.qty <= 0) {
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

      if (cart.items.length) {
        await cart.save({
          session: dbSession
        });
      } else {
        await Cart.deleteOne(
          {
            _id: cart._id,
            user: payment.clientId
          },
          {
            session: dbSession
          }
        );
      }
    });

    return packageDoc;

  } finally {
    await dbSession.endSession();
  }
}


module.exports = {
  createPackageFromCart,
  createPackageFromPayment
};
