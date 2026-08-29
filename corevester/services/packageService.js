// =========================================================
// services/packageService.js
// PACKAGE CREATION / PACKAGE HISTORY
// =========================================================
const mongoose = require("mongoose");
const Cart = require("../models/carts");
const Package = require("../models/package");
const Payment = require("../models/Payment");
const Product = require("../models/products");
const { getUserId, getSessionId } = require("./shopContext");

async function createPackageFromCart(req, paymentData = {}) {
  const clientId = getUserId(req);
  const sessionId = getSessionId(req);

  if (!clientId) throw new Error("Login is required.");
  if (!sessionId) throw new Error("Cart session is missing.");

  const dbSession = await mongoose.startSession();
  let created;

  try {
    await dbSession.withTransaction(async () => {
      const cart = await Cart.findOne({
        sessionId,
        user: clientId
      }).session(dbSession);

      if (!cart || !cart.items.length) {
        throw new Error("Your cart is empty.");
      }

      const items = cart.items.map(item => ({
        productId: item.product,
        name: item.name,
        price: Number(item.price || 0),
        qty: Number(item.qty || 0),
        image: item.image || ""
      }));

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      );

      [created] = await Package.create(
        [{
          clientId,
          items,
          totalAmount,
          paymentMethod: paymentData.paymentMethod || "pay_on_delivery",
          paymentStatus: paymentData.paymentStatus || "not_required",
          mpesaReceiptNumber: paymentData.mpesaReceiptNumber || "",
          phoneNumber: paymentData.phoneNumber || "",
          status: "pending"
        }],
        { session: dbSession }
      );

      await Cart.deleteOne({ _id: cart._id }, { session: dbSession });
    });

    return created;
  } finally {
    await dbSession.endSession();
  }
}

async function getUserPackages(req) {
  const clientId = getUserId(req);
  if (!clientId) throw new Error("Login is required.");

  return Package.find({ clientId }).sort({ createdAt: -1 }).lean();
}

async function getUserPackage(req, id) {
  const clientId = getUserId(req);
  if (!clientId) throw new Error("Login is required.");

  return Package.findOne({ _id: id, clientId }).lean();
}

async function createPackageFromPayment(paymentId) {
  const dbSession = await mongoose.startSession();
  let packageDoc;

  try {
    await dbSession.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        status: "confirmed"
      }).session(dbSession);

      if (!payment) return;

      const existing = await Package.findOne({
        clientId: payment.clientId,
        "items.0": { $exists: true },
        mpesaReceiptNumber: payment.mpesaReceiptNumber
      }).session(dbSession);

      if (existing) {
        packageDoc = existing;
        return;
      }

      const items = payment.cartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price || 0),
        qty: Number(item.qty || 0),
        image: item.image || ""
      }));

      [packageDoc] = await Package.create(
        [{
          clientId: payment.clientId,
          items,
          totalAmount: payment.amount,
          paymentMethod: "mpesa",
          paymentStatus: "confirmed",
          mpesaReceiptNumber: payment.mpesaReceiptNumber,
          phoneNumber: payment.phoneNumber,
          status: "pending"
        }],
        { session: dbSession }
      );

      const cart = await Cart.findOne({
        sessionId: payment.sessionId,
        user: payment.clientId
      }).session(dbSession);

      if (cart) {
        for (const paidItem of payment.cartItems) {
          const current = cart.items.find(
            item => String(item.productId) === String(paidItem.productId)
          );

          if (!current) continue;

          current.qty -= Number(paidItem.qty || 0);
          if (current.qty <= 0) {
            cart.items = cart.items.filter(
              item => String(item.productId) !== String(paidItem.productId)
            );
          }
        }

        await cart.save({ session: dbSession });
      }
    });

    return packageDoc;
  } finally {
    await dbSession.endSession();
  }
}

async function releasePaymentReservation(payment) {
  const dbSession = await mongoose.startSession();

  try {
    await dbSession.withTransaction(async () => {
      for (const item of payment.cartItems || []) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { units: Number(item.qty || 0) } },
          { session: dbSession }
        );
      }

      const cart = await Cart.findOne({
        sessionId: payment.sessionId,
        user: payment.clientId
      }).session(dbSession);

      if (cart) {
        for (const failedItem of payment.cartItems || []) {
          const current = cart.items.find(
            item => String(item.productId) === String(failedItem.productId)
          );

          if (!current) continue;

          current.qty -= Number(failedItem.qty || 0);
          if (current.qty <= 0) {
            cart.items = cart.items.filter(
              item => String(item.productId) !== String(failedItem.productId)
            );
          }
        }

        await cart.save({ session: dbSession });
      }
    });
  } finally {
    await dbSession.endSession();
  }
}

module.exports = {
  createPackageFromCart,
  getUserPackages,
  getUserPackage,
  createPackageFromPayment,
  releasePaymentReservation
};
