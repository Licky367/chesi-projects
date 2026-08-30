const mongoose = require("mongoose");

const Cart = require("../models/carts");
const Package = require("../models/package");
const Payment = require("../models/Payment");
const Product = require("../models/products");

const {
  getUserId,
  getSessionId
} = require("./shopContext");

// ---------------------------------------------------------
// PAYMENT STATUS HELPERS
// ---------------------------------------------------------

function getPaymentStatus(totalAmount, totalPaid) {
  const total = Math.max(
    0,
    Number(totalAmount || 0)
  );

  const paid = Math.max(
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

async function getConfirmedPaymentTotal(packageId, dbSession = null) {
  const match = {
    packageId,
    status: "confirmed"
  };

  const aggregate = Payment.aggregate([
    {
      $match: match
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: {
            $ifNull: ["$paidAmount", 0]
          }
        }
      }
    }
  ]);

  if (dbSession) {
    aggregate.session(dbSession);
  }

  const result = await aggregate;

  return Math.max(
    0,
    Number(result[0]?.totalPaid || 0)
  );
}

// ---------------------------------------------------------
// CREATE PACKAGE FROM CART
// ---------------------------------------------------------

async function createPackageFromCart(
  req,
  paymentData = {}
) {
  const clientId = getUserId(req);
  const sessionId = getSessionId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  if (!sessionId) {
    throw new Error("Cart session is missing.");
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
          }).session(dbSession);

        if (!cart || !cart.items.length) {
          throw new Error("Your cart is empty.");
        }

        const items =
          cart.items.map(item => ({
            productId: item.product,
            name: item.name,
            price: Number(item.price || 0),
            qty: Number(item.qty || 0),
            image: item.image || ""
          }));

        const totalAmount =
          items.reduce(
            (sum, item) =>
              sum +
              item.price * item.qty,
            0
          );

        [created] =
          await Package.create(
            [
              {
                clientId,
                items,
                totalAmount,

                paymentMethod:
                  paymentData.paymentMethod ||
                  "pay_on_delivery",

                // Every new package starts unpaid unless
                // an already-confirmed payment created it.
                paymentStatus:
                  paymentData.paymentStatus === "paid"
                    ? "paid"
                    : "unpaid",

                paidAmount:
                  paymentData.paymentStatus === "paid"
                    ? Number(paymentData.paidAmount || 0)
                    : 0,

                mpesaReceiptNumber:
                  paymentData.mpesaReceiptNumber ||
                  "",

                phoneNumber:
                  paymentData.phoneNumber ||
                  "",

                status: "pending"
              }
            ],
            {
              session: dbSession
            }
          );

        // Product.units was already reduced when the
        // cart item was added. Do not reduce it again.
        await Cart.deleteOne(
          {
            _id: cart._id
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

// ---------------------------------------------------------
// PACKAGE LIST
// ---------------------------------------------------------

async function getUserPackages(req) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  return Package
    .find({ clientId })
    .sort({ createdAt: -1 })
    .lean();
}

// ---------------------------------------------------------
// SINGLE PACKAGE
// ---------------------------------------------------------

async function getUserPackage(req, id) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  return Package.findOne({
    _id: id,
    clientId
  }).lean();
}

// ---------------------------------------------------------
// CONFIRMED CART M-PESA PAYMENT -> PACKAGE
// ---------------------------------------------------------

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
          }).session(dbSession);

        if (!payment) {
          return;
        }

        const existing =
          await Package.findOne({
            clientId: payment.clientId,
            paymentMethod: "mpesa",
            mpesaReceiptNumber:
              payment.mpesaReceiptNumber
          }).session(dbSession);

        if (existing) {
          packageDoc = existing;
          return;
        }

        const items =
          payment.cartItems.map(item => ({
            productId: item.productId,
            name: item.name,
            price: Number(item.price || 0),
            qty: Number(item.qty || 0),
            image: item.image || ""
          }));

        const paidAmount =
          Number(payment.paidAmount || 0);

        [packageDoc] =
          await Package.create(
            [
              {
                clientId: payment.clientId,
                items,
                totalAmount: payment.amount,
                paymentMethod: "mpesa",

                paymentStatus:
                  paidAmount >=
                  Number(payment.amount || 0)
                    ? "paid"
                    : "partialPaid",

                paidAmount,

                mpesaReceiptNumber:
                  payment.mpesaReceiptNumber,

                phoneNumber:
                  payment.phoneNumber,

                status: "pending"
              }
            ],
            {
              session: dbSession
            }
          );

        const cart =
          await Cart.findOne({
            sessionId: payment.sessionId,
            user: payment.clientId
          }).session(dbSession);

        if (cart) {
          for (const paidItem of payment.cartItems) {
            const current =
              cart.items.find(
                item =>
                  String(item.productId) ===
                  String(paidItem.productId)
              );

            if (!current) {
              continue;
            }

            current.qty -=
              Number(paidItem.qty || 0);

            if (current.qty <= 0) {
              cart.items =
                cart.items.filter(
                  item =>
                    String(item.productId) !==
                    String(paidItem.productId)
                );
            }
          }

          if (cart.items.length) {
            await cart.save({
              session: dbSession
            });
          } else {
            await Cart.deleteOne(
              {
                _id: cart._id
              },
              {
                session: dbSession
              }
            );
          }
        }
      }
    );

    return packageDoc;
  } finally {
    await dbSession.endSession();
  }
}

// ---------------------------------------------------------
// CONFIRMED PAYMENT FOR EXISTING PACKAGE
// ---------------------------------------------------------

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
            status: "confirmed",
            packageId: {
              $ne: null
            }
          }).session(dbSession);

        if (!payment) {
          return;
        }

        const packageDocQuery =
          await Package.findOne({
            _id: payment.packageId,
            clientId: payment.clientId
          }).session(dbSession);

        if (!packageDocQuery) {
          throw new Error(
            "The package linked to this M-Pesa payment no longer exists."
          );
        }

        // Sum ALL confirmed payments for this package.
        const totalPaid =
          await getConfirmedPaymentTotal(
            packageDocQuery._id,
            dbSession
          );

        const totalAmount =
          Math.max(
            0,
            Number(
              packageDocQuery.totalAmount || 0
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
          session: dbSession
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

// ---------------------------------------------------------
// FAILED CART PAYMENT -> RELEASE RESERVATION
// ---------------------------------------------------------

async function releasePaymentReservation(
  payment
) {
  const dbSession =
    await mongoose.startSession();

  try {
    await dbSession.withTransaction(
      async () => {
        for (const item of payment.cartItems || []) {
          await Product.findByIdAndUpdate(
            item.productId,
            {
              $inc: {
                units:
                  Number(item.qty || 0)
              }
            },
            {
              session: dbSession
            }
          );
        }

        const cart =
          await Cart.findOne({
            sessionId: payment.sessionId,
            user: payment.clientId
          }).session(dbSession);

        if (!cart) {
          return;
        }

        for (
          const failedItem
          of payment.cartItems || []
        ) {
          const current =
            cart.items.find(
              item =>
                String(item.productId) ===
                String(failedItem.productId)
            );

          if (!current) {
            continue;
          }

          current.qty -=
            Number(
              failedItem.qty || 0
            );

          if (current.qty <= 0) {
            cart.items =
              cart.items.filter(
                item =>
                  String(item.productId) !==
                  String(failedItem.productId)
              );
          }
        }

        if (cart.items.length) {
          await cart.save({
            session: dbSession
          });
        } else {
          await Cart.deleteOne(
            {
              _id: cart._id
            },
            {
              session: dbSession
            }
          );
        }
      }
    );
  } finally {
    await dbSession.endSession();
  }
}

module.exports = {
  getPaymentStatus,
  getConfirmedPaymentTotal,
  createPackageFromCart,
  getUserPackages,
  getUserPackage,
  createPackageFromPayment,
  confirmPackagePayment,
  releasePaymentReservation
};
