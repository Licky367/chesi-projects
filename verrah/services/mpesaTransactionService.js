// =========================================================
// services/mpesaTransactionService.js
// DARAJA TRANSACTION STATUS VERIFICATION
// =========================================================

const Package =
  require("../models/package");

const Payment =
  require("../models/Payment");

const MpesaVerification =
  require("../models/MpesaVerification");

const {
  confirmPackagePayment
} =
  require("./packageService");

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function cleanTransactionCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
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

  const credentials =
    Buffer
      .from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
      )
      .toString("base64");

  const response =
    await fetch(
      `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization:
            `Basic ${credentials}`
        }
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.access_token
  ) {
    throw new Error(
      data.errorMessage ||
      "Unable to obtain M-Pesa access token."
    );
  }

  return data.access_token;
}

// ---------------------------------------------------------
// CREATE VERIFICATION
// ---------------------------------------------------------

async function createVerification({
  packageId,
  clientId,
  transactionCode
}) {
  const code =
    cleanTransactionCode(
      transactionCode
    );

  if (!code) {
    throw new Error(
      "Enter the M-Pesa transaction code."
    );
  }

  const packageDoc =
    await Package.findOne({
      _id: packageId,
      clientId
    });

  if (!packageDoc) {
    throw new Error(
      "Package not found."
    );
  }

  if (
    packageDoc.paymentStatus ===
    "paid"
  ) {
    throw new Error(
      "This package is already fully paid."
    );
  }

  const existingPayment =
    await Payment.findOne({
      mpesaReceiptNumber:
        code,
      status:
        "confirmed"
    });

  if (existingPayment) {
    throw new Error(
      "This M-Pesa transaction has already been used."
    );
  }

  const existing =
    await MpesaVerification.findOne({
      transactionCode:
        code
    });

  if (existing) {
    if (
      existing.packageId.toString() !==
      packageId.toString()
    ) {
      throw new Error(
        "This transaction code is already linked to another package."
      );
    }

    if (
      existing.status ===
      "pending"
    ) {
      return existing;
    }

    throw new Error(
      "This transaction code has already been processed."
    );
  }

  return MpesaVerification.create({
    packageId,
    clientId,
    transactionCode:
      code,
    status:
      "pending"
  });
}

// ---------------------------------------------------------
// SUBMIT TRANSACTION STATUS QUERY
// ---------------------------------------------------------

async function submitTransactionQuery(
  verification
) {
  if (
    !process.env.MPESA_SHORTCODE ||
    !process.env.MPESA_TRANSACTION_INITIATOR ||
    !process.env.MPESA_SECURITY_CREDENTIAL ||
    !process.env.MPESA_TRANSACTION_RESULT_URL ||
    !process.env.MPESA_TRANSACTION_TIMEOUT_URL
  ) {
    throw new Error(
      "M-Pesa Transaction Status configuration is incomplete."
    );
  }

  const token =
    await getAccessToken();

  const payload = {
    Initiator:
      process.env.MPESA_TRANSACTION_INITIATOR,

    SecurityCredential:
      process.env.MPESA_SECURITY_CREDENTIAL,

    CommandID:
      "TransactionStatusQuery",

    TransactionID:
      verification.transactionCode,

    PartyA:
      process.env.MPESA_SHORTCODE,

    IdentifierType:
      "4",

    ResultURL:
      process.env.MPESA_TRANSACTION_RESULT_URL,

    QueueTimeOutURL:
      process.env.MPESA_TRANSACTION_TIMEOUT_URL,

    Remarks:
      `CoreVester package ${String(
        verification.packageId
      )}`,

    Occasion:
      "CoreVester package payment"
  };

  const response =
    await fetch(
      `${baseUrl()}/mpesa/transactionstatus/v1/query`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.errorMessage ||
      data.ResponseDescription ||
      "M-Pesa transaction verification request failed."
    );
  }

  return data;
}

// ---------------------------------------------------------
// RESULT PARAMETERS
// ---------------------------------------------------------

function resultParameters(result) {
  return (
    result?.ResultParameters
      ?.ResultParameter || []
  );
}

function parameterValue(
  parameters,
  ...names
) {
  for (const name of names) {
    const item =
      parameters.find(
        parameter =>
          parameter.Key ===
          name
      );

    if (
      item &&
      item.Value !== undefined &&
      item.Value !== null
    ) {
      return item.Value;
    }
  }

  return null;
}

// ---------------------------------------------------------
// PROCESS RESULT CALLBACK
// ---------------------------------------------------------

async function handleTransactionResult(
  body
) {
  const result =
    body?.Result;

  if (!result) {
    return null;
  }

  const parameters =
    resultParameters(
      result
    );

  const transactionId =
    String(
      parameterValue(
        parameters,
        "TransactionID"
      ) ||
      ""
    ).trim().toUpperCase();

  if (!transactionId) {
    return null;
  }

  const verification =
    await MpesaVerification.findOne({
      transactionCode:
        transactionId
    });

  if (!verification) {
    console.warn(
      "CoreVester: no verification record for transaction",
      transactionId
    );

    return null;
  }

  if (
    verification.status !==
    "pending"
  ) {
    return verification;
  }

  const resultCode =
    Number(
      result.ResultCode
    );

  if (resultCode !== 0) {
    verification.status =
      "failed";

    verification.resultDescription =
      result.ResultDesc ||
      "M-Pesa transaction could not be verified.";

    await verification.save();

    return verification;
  }

  const amount =
    Number(
      parameterValue(
        parameters,
        "Amount"
      ) || 0
    );

  const receipt =
    String(
      parameterValue(
        parameters,
        "ReceiptNo",
        "MpesaReceiptNumber",
        "TransactionID"
      ) ||
      transactionId
    ).trim();

  const phone =
    String(
      parameterValue(
        parameters,
        "MSISDN",
        "PhoneNumber"
      ) ||
      ""
    ).trim();

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    verification.status =
      "failed";

    verification.resultDescription =
      "M-Pesa returned an invalid payment amount.";

    await verification.save();

    return verification;
  }

  const packageDoc =
    await Package.findOne({
      _id:
        verification.packageId,
      clientId:
        verification.clientId
    });

  if (!packageDoc) {
    verification.status =
      "failed";

    verification.resultDescription =
      "The package associated with this payment no longer exists.";

    await verification.save();

    return verification;
  }

  const currentPaid =
    Number(
      packageDoc.paidAmount || 0
    );

  const totalAmount =
    Number(
      packageDoc.totalAmount || 0
    );

  const arrears =
    Math.max(
      0,
      totalAmount -
      currentPaid
    );

  if (arrears <= 0) {
    verification.status =
      "failed";

    verification.resultDescription =
      "This package has no outstanding balance.";

    await verification.save();

    return verification;
  }

  if (amount > arrears) {
    verification.status =
      "failed";

    verification.amount =
      amount;

    verification.resultDescription =
      `Verified payment of KSh ${amount.toLocaleString()} exceeds the remaining balance of KSh ${arrears.toLocaleString()}.`;

    await verification.save();

    return verification;
  }

  const duplicate =
    await Payment.findOne({
      mpesaReceiptNumber:
        receipt,
      status:
        "confirmed"
    });

  if (duplicate) {
    verification.status =
      "failed";

    verification.resultDescription =
      "This M-Pesa transaction has already been credited.";

    await verification.save();

    return verification;
  }

  const payment =
    await Payment.create({
      clientId:
        verification.clientId,

      sessionId:
        "",

      cartItems:
        [],

      packageId:
        packageDoc._id,

      amount,

      paidAmount:
        amount,

      phoneNumber:
        phone,

      mpesaReceiptNumber:
        receipt,

      status:
        "confirmed",

      resultCode:
        String(resultCode),

      resultDescription:
        result.ResultDesc ||
        ""
    });

  verification.status =
    "confirmed";

  verification.amount =
    amount;

  verification.phoneNumber =
    phone;

  verification.receiptNumber =
    receipt;

  verification.resultDescription =
    result.ResultDesc ||
    "";

  await verification.save();

  const updatedPackage =
    await confirmPackagePayment(
      payment._id
    );

  return {
    verification,
    payment,
    package:
      updatedPackage
  };
}

// ---------------------------------------------------------
// TIMEOUT CALLBACK
// ---------------------------------------------------------

async function handleTransactionTimeout(
  body
) {
  const result =
    body?.Result;

  if (!result) {
    return null;
  }

  const parameters =
    resultParameters(
      result
    );

  const transactionId =
    String(
      parameterValue(
        parameters,
        "TransactionID"
      ) ||
      ""
    ).trim().toUpperCase();

  if (!transactionId) {
    return null;
  }

  const verification =
    await MpesaVerification.findOne({
      transactionCode:
        transactionId,
      status:
        "pending"
    });

  if (!verification) {
    return null;
  }

  verification.status =
    "failed";

  verification.resultDescription =
    result.ResultDesc ||
    "M-Pesa verification timed out.";

  await verification.save();

  return verification;
}

module.exports = {
  cleanTransactionCode,
  createVerification,
  submitTransactionQuery,
  handleTransactionResult,
  handleTransactionTimeout
};
