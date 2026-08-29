// =========================================================
// services/paymentService.js
// MPESA DARAJA STK PUSH
//
// Required environment variables:
// MPESA_CONSUMER_KEY
// MPESA_CONSUMER_SECRET
// MPESA_SHORTCODE
// MPESA_PASSKEY
// MPESA_CALLBACK_URL
// MPESA_ENV=production | sandbox
//
// For production, MPESA_CALLBACK_URL must be a public HTTPS URL.
// =========================================================
const Payment = require("../models/Payment");
const Cart = require("../models/carts");
const { calculateTotal } = require("./cartService");
const { getUserId, getSessionId } = require("./shopContext");
const packageService = require("./packageService");

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizePhone(phone) {
  let value = String(phone || "").replace(/\D/g, "");

  if (value.startsWith("0")) value = "254" + value.slice(1);
  if (value.startsWith("7")) value = "254" + value;

  if (!/^2547\d{8}$/.test(value)) {
    throw new Error("Enter a valid Kenyan M-Pesa number, e.g. 0712345678.");
  }

  return value;
}

async function getAccessToken() {
  const credentials = Buffer
    .from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`)
    .toString("base64");

  const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`
    }
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || "Unable to obtain M-Pesa access token.");
  }

  return data.access_token;
}

async function initiateStkPush(req, phoneNumber) {
  const clientId = getUserId(req);
  const sessionId = getSessionId(req);

  if (!clientId) throw new Error("Login is required.");
  if (!sessionId) throw new Error("Cart session is missing.");

  const cart = await Cart.findOne({ sessionId, user: clientId }).lean();

  if (!cart || !cart.items.length) {
    throw new Error("Your cart is empty.");
  }

  const amount = Math.ceil(calculateTotal(cart));
  if (amount < 1) throw new Error("Cart total must be at least KSh 1.");

  const phone = normalizePhone(phoneNumber);
  const token = await getAccessToken();

  const ts = timestamp();
  const password = Buffer
    .from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${ts}`)
    .toString("base64");

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `COREVESTER-${String(clientId).slice(-8)}`,
    TransactionDesc: "CoreVester purchase"
  };

  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "M-Pesa STK Push failed.");
  }

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
    amount,
    phoneNumber: phone,
    merchantRequestId: data.MerchantRequestID || "",
    checkoutRequestId: data.CheckoutRequestID,
    status: "pending"
  });

  return {
    paymentId: payment._id,
    checkoutRequestId: payment.checkoutRequestId,
    customerMessage: data.CustomerMessage || "Check your phone and enter your M-Pesa PIN."
  };
}

async function handleCallback(body) {
  const callback = body?.Body?.stkCallback;
  if (!callback) return;

  const payment = await Payment.findOne({
    checkoutRequestId: callback.CheckoutRequestID
  });

  if (!payment || payment.status !== "pending") return;

  if (Number(callback.ResultCode) === 0) {
    const metadata = callback.CallbackMetadata?.Item || [];
    const receipt = metadata.find(x => x.Name === "MpesaReceiptNumber")?.Value || "";

    payment.status = "confirmed";
    payment.mpesaReceiptNumber = String(receipt);
    payment.resultCode = String(callback.ResultCode);
    payment.resultDescription = callback.ResultDesc || "";
    await payment.save();

    await packageService.createPackageFromPayment(payment._id);
  } else {
    payment.status = "failed";
    payment.resultCode = String(callback.ResultCode);
    payment.resultDescription = callback.ResultDesc || "";
    await payment.save();

    await packageService.releasePaymentReservation(payment);
  }
}

async function getPaymentForUser(req, id) {
  const clientId = getUserId(req);
  return Payment.findOne({ _id: id, clientId }).lean();
}

module.exports = {
  normalizePhone,
  initiateStkPush,
  handleCallback,
  getPaymentForUser
};
