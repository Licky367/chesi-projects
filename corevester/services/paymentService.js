// =========================================================
// services/paymentService.js
// MPESA DARAJA STK PUSH
//
// Required environment variables:
//
// MPESA_CONSUMER_KEY
// MPESA_CONSUMER_SECRET
// MPESA_SHORTCODE
// MPESA_PASSKEY
// MPESA_CALLBACK_URL
// MPESA_ENV=production | sandbox
//
// IMPORTANT:
// Daraja expects the timestamp used to create the STK password
// to be in Kenya time. Render/Linux servers commonly run UTC,
// so this implementation explicitly uses Africa/Nairobi.
// =========================================================

const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Cart = require("../models/carts");
const Package = require("../models/package");

const {
  calculateTotal
} = require("./cartService");

const {
  getUserId,
  getSessionId
} = require("./shopContext");

const packageService = require("./packageService");

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp() {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }
  ).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return (
    values.year +
    values.month +
    values.day +
    values.hour +
    values.minute +
    values.second
  );
}

function normalizePhone(phone) {
  let value = String(phone || "")
    .replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = "254" + value.slice(1);
  }

  if (value.startsWith("7")) {
    value = "254" + value;
  }

  if (!/^2547\d{8}$/.test(value)) {
    throw new Error(
      "Enter a valid Kenyan M-Pesa number, e.g. 0712345678."
    );
  }

  return value;
}

async function getAccessToken() {
  if (
    !process.env.MPESA_CONSUMER_KEY ||
    !process.env.MPESA_CONSUMER_SECRET
  ) {
    throw new Error(
      "M-Pesa consumer credentials are not configured."
    );
  }

  const credentials = Buffer
    .from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    )
    .toString("base64");

  const response = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.errorMessage ||
      "Unable to obtain M-Pesa access token."
    );
  }

  return data.access_token;
}

function buildStkPayload({
  phone,
  amount,
  clientId
}) {
  if (
    !process.env.MPESA_SHORTCODE ||
    !process.env.MPESA_PASSKEY ||
    !process.env.MPESA_CALLBACK_URL
  ) {
    throw new Error(
      "M-Pesa shortcode, passkey or callback URL is not configured."
    );
  }

  const ts = timestamp();

  const password = Buffer
    .from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`
    )
    .toString("base64");

  return {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference:
      `COREVESTER-${String(clientId).slice(-8)}`,
    TransactionDesc: "CoreVester purchase"
  };
}

async function sendStkPush(payload) {
  const token = await getAccessToken();

  const response = await fetch(
    `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (
    !response.ok ||
    String(data.ResponseCode) !== "0"
  ) {
    throw new Error(
      data.errorMessage ||
      data.ResponseDescription ||
      "M-Pesa STK Push failed."
    );
  }

  return data;
}

// ---------------------------------------------------------
// CART CHECKOUT -> M-PESA
// ---------------------------------------------------------
async function initiateStkPush(req, phoneNumber) {
  const clientId = getUserId(req);
  const sessionId = getSessionId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  if (!sessionId) {
    throw new Error("Cart session is missing.");
  }

  const cart = await Cart.findOne({
    sessionId,
    user: clientId
  }).lean();

  if (!cart || !cart.items.length) {
    throw new Error("Your cart is empty.");
  }

  const amount = Math.ceil(
    calculateTotal(cart)
  );

  if (amount < 1) {
    throw new Error(
      "Cart total must be at least KSh 1."
    );
  }

  const phone = normalizePhone(phoneNumber);

  const payload = buildStkPayload({
    phone,
    amount,
    clientId
  });

  const data = await sendStkPush(payload);

  const payment = await Payment.create({
    clientId,
    sessionId,

    cartItems: cart.items.map(item => ({
      productId: item.product,
      name: item.name,
      price: item.price,
      image: item.image || "",
      qty: item.qty
    })),

    packageId: null,

    amount,
    phoneNumber: phone,

    merchantRequestId:
      data.MerchantRequestID || "",

    checkoutRequestId:
      data.CheckoutRequestID,

    status: "pending"
  });

  return {
    paymentId: payment._id,
    checkoutRequestId:
      payment.checkoutRequestId,
    customerMessage:
      data.CustomerMessage ||
      "Check your phone and enter your M-Pesa PIN."
  };
}

// ---------------------------------------------------------
// EXISTING PACKAGE -> M-PESA
// ---------------------------------------------------------
async function initiatePackageStkPush(
  req,
  packageId,
  phoneNumber
) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  if (!mongoose.isValidObjectId(packageId)) {
    throw new Error("Invalid package.");
  }

  const packageDoc = await Package.findOne({
    _id: packageId,
    clientId
  }).lean();

  if (!packageDoc) {
    throw new Error("Package not found.");
  }

  if (
    packageDoc.paymentStatus === "confirmed"
  ) {
    throw new Error(
      "This package has already been paid."
    );
  }

  if (
    packageDoc.paymentMethod !== "pay_on_delivery"
  ) {
    throw new Error(
      "This package is not awaiting payment."
    );
  }

  const amount = Math.ceil(
    Number(packageDoc.totalAmount || 0)
  );

  if (amount < 1) {
    throw new Error(
      "Package total must be at least KSh 1."
    );
  }

  const phone = normalizePhone(phoneNumber);

  // Prevent accidental duplicate STK pushes while one is
  // already awaiting a callback.
  const existingPending =
    await Payment.findOne({
      clientId,
      packageId: packageDoc._id,
      status: "pending"
    }).sort({ createdAt: -1 });

  if (existingPending) {
    return {
      paymentId: existingPending._id,
      checkoutRequestId:
        existingPending.checkoutRequestId,
      customerMessage:
        "An M-Pesa payment is already awaiting confirmation."
    };
  }

  const payload = buildStkPayload({
    phone,
    amount,
    clientId
  });

  const data = await sendStkPush(payload);

  const payment = await Payment.create({
    clientId,
    sessionId: "",

    cartItems: (packageDoc.items || []).map(item => ({
      productId: item.product,
      name: item.name,
      price: item.price,
      image: item.image || "",
      qty: item.qty
    })),

    packageId: packageDoc._id,

    amount,
    phoneNumber: phone,

    merchantRequestId:
      data.MerchantRequestID || "",

    checkoutRequestId:
      data.CheckoutRequestID,

    status: "pending"
  });

  return {
    paymentId: payment._id,
    checkoutRequestId:
      payment.checkoutRequestId,
    customerMessage:
      data.CustomerMessage ||
      "Check your phone and enter your M-Pesa PIN."
  };
}

// ---------------------------------------------------------
// DARAJA CALLBACK
// ---------------------------------------------------------
async function handleCallback(body) {
  const callback =
    body?.Body?.stkCallback;

  if (!callback) {
    return;
  }

  const checkoutRequestId =
    callback.CheckoutRequestID;

  if (!checkoutRequestId) {
    return;
  }

  const payment =
    await Payment.findOne({
      checkoutRequestId
    });

  if (!payment || payment.status !== "pending") {
    return;
  }

  if (
    Number(callback.ResultCode) === 0
  ) {
    const metadata =
      callback.CallbackMetadata?.Item || [];

    const receipt =
      metadata.find(
        x => x.Name === "MpesaReceiptNumber"
      )?.Value || "";

    payment.status = "confirmed";
    payment.mpesaReceiptNumber =
      String(receipt);

    payment.resultCode =
      String(callback.ResultCode);

    payment.resultDescription =
      callback.ResultDesc || "";

    await payment.save();

    // Two possible successful payment flows:
    //
    // 1. Cart checkout with M-Pesa:
    //    create the package after confirmation.
    //
    // 2. Existing Pay-on-delivery package:
    //    mark that package as paid instead of creating
    //    a second package.
    if (payment.packageId) {
      await packageService.confirmPackagePayment(
        payment._id
      );
    } else {
      await packageService.createPackageFromPayment(
        payment._id
      );
    }

    return;
  }

  payment.status = "failed";

  payment.resultCode =
    String(callback.ResultCode);

  payment.resultDescription =
    callback.ResultDesc || "";

  await payment.save();

  // Only cart-originated payments reserved stock in
  // Product.units. Existing packages already represent
  // the reserved stock, so do not release it here.
  if (!payment.packageId) {
    await packageService.releasePaymentReservation(
      payment
    );
  }
}

async function getPaymentForUser(req, id) {
  const clientId = getUserId(req);

  if (!clientId) {
    return null;
  }

  return Payment.findOne({
    _id: id,
    clientId
  }).lean();
}

module.exports = {
  normalizePhone,
  initiateStkPush,
  initiatePackageStkPush,
  handleCallback,
  getPaymentForUser
};
