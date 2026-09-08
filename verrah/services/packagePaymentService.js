const mongoose = require("mongoose");

const Package = require("../models/package");
const Payment = require("../models/Payment");

function getPaymentStatus(totalAmount, totalPaid) {
  const total = Math.max(0, Number(totalAmount || 0));
  const paid = Math.max(0, Number(totalPaid || 0));

  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partialPaid";
}

async function calculateTotalPaid(packageId, session = null) {
  const aggregate = Payment.aggregate([
    {
      $match: {
        packageId: new mongoose.Types.ObjectId(packageId),
        status: "confirmed"
      }
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: { $ifNull: ["$paidAmount", 0] }
        }
      }
    }
  ]);

  if (session) aggregate.session(session);

  const result = await aggregate;

  return Math.max(
    0,
    Number(result[0]?.totalPaid || 0)
  );
}

async function refreshPackagePayment(packageId, session = null) {
  const query = Package.findById(packageId);

  if (session) query.session(session);

  const packageDoc = await query;

  if (!packageDoc) {
    throw new Error("Package not found.");
  }

  const totalPaid = await calculateTotalPaid(
    packageDoc._id,
    session
  );

  packageDoc.paidAmount = Math.min(
    totalPaid,
    Math.max(0, Number(packageDoc.totalAmount || 0))
  );

  packageDoc.paymentStatus = getPaymentStatus(
    packageDoc.totalAmount,
    packageDoc.paidAmount
  );

  await packageDoc.save(
    session ? { session } : undefined
  );

  return packageDoc;
}

// Call this when an individual payment is confirmed.
async function recordConfirmedPayment(
  paymentId,
  paidAmount
) {
  const dbSession = await mongoose.startSession();
  let packageDoc = null;

  try {
    await dbSession.withTransaction(async () => {
      const payment = await Payment.findById(
        paymentId
      ).session(dbSession);

      if (!payment) {
        throw new Error("Payment not found.");
      }

      const amount = Number(paidAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(
          "Payment amount must be greater than zero."
        );
      }

      payment.paidAmount = amount;
      payment.status = "confirmed";

      await payment.save({
        session: dbSession
      });

      if (!payment.packageId) return;

      packageDoc = await refreshPackagePayment(
        payment.packageId,
        dbSession
      );

      packageDoc.paymentMethod = "mpesa";
      packageDoc.phoneNumber =
        payment.phoneNumber || "";

      if (payment.mpesaReceiptNumber) {
        packageDoc.mpesaReceiptNumber =
          payment.mpesaReceiptNumber;
      }

      await packageDoc.save({
        session: dbSession
      });
    });

    return packageDoc;
  } finally {
    await dbSession.endSession();
  }
}

async function getPackagePaymentSummary(packageId) {
  const packageDoc = await Package.findById(
    packageId
  ).lean();

  if (!packageDoc) return null;

  const totalPaid =
    await calculateTotalPaid(packageId);

  const totalAmount = Math.max(
    0,
    Number(packageDoc.totalAmount || 0)
  );

  const arrearsAmount = Math.max(
    0,
    totalAmount - totalPaid
  );

  return {
    totalAmount,
    paidAmount: totalPaid,
    totalPaid,
    arrearsAmount,
    paymentStatus: getPaymentStatus(
      totalAmount,
      totalPaid
    )
  };
}

module.exports = {
  getPaymentStatus,
  calculateTotalPaid,
  refreshPackagePayment,
  recordConfirmedPayment,
  getPackagePaymentSummary
};
