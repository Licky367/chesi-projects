// =========================================================
// verrah/services/packagePaymentService.js
//
// VERRAH COSMETICS
// PACKAGE PAYMENT SERVICE
// =========================================================

const mongoose = require("mongoose");

const Package = require("../../models/package");
const Payment = require("../../models/Payment");
const User = require("../../models/user");
const DeliveredPackage =
  require("../../models/delivered");

const {
  SUBSTATION_VIEW_FIELDS,
  getPaymentStatus,
  getConfirmedPaymentTotal,
  normalizePhone,
  normalizeSalesName,
  preparePackageDestination,
  roleOf,
  staffIdOf
} = require("./packageHelpers");


// =========================================================
// RECORD PAYMENT
// =========================================================

async function recordPayment(req, id, amount) {
  const role = roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Staff or admin access required."
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    throw new Error(
      "Amount paid must be a valid non-negative number."
    );
  }

  const pkg =
    await Package.findById(id);

  if (!pkg) {
    throw new Error(
      "Package not found."
    );
  }

  if (pkg.status !== "delivered") {
    throw new Error(
      "Amount paid can only be entered after delivery."
    );
  }

  if (
    role === "staff" &&
    String(
      pkg.deliveredByStaffId || ""
    ) !== staffIdOf(req)
  ) {
    throw new Error(
      "Only the staff member who delivered this package can record its payment."
    );
  }

  if (
    numericAmount >
    Number(pkg.totalAmount || 0)
  ) {
    throw new Error(
      "Amount paid cannot exceed the package total."
    );
  }

  pkg.paidAmount =
    numericAmount;

  pkg.paymentStatus =
    numericAmount >=
    Number(pkg.totalAmount || 0)
      ? "paid"
      : numericAmount > 0
        ? "partialPaid"
        : "unpaid";

  await pkg.save();


  // ===============================================
  // UPDATE DELIVERED PACKAGE
  // ===============================================

  await DeliveredPackage.findOneAndUpdate(
    {
      packageId: pkg._id
    },
    {
      amountPaid:
        numericAmount,

      arrearsAmount:
        Math.max(
          0,
          Number(pkg.totalAmount || 0) -
          numericAmount
        )
    },
    {
      new: true
    }
  );


  // ===============================================
  // RETURN PACKAGE WITH DESTINATION
  // ===============================================

  const result =
    await Package.findById(pkg._id)
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

async function confirmPackagePayment(paymentId) {
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
          await require("./packageHelpers")
            .getClient(
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

        if (clientPhone) {
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

        if (paymentSalesName) {
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

        if (
          !packageDocQuery.packageSubstation &&
          client?.pickupStation
        ) {
          packageDocQuery.packageSubstation =
            client.pickupStation._id ||
            client.pickupStation;
        }


        await packageDocQuery.save({
          session: dbSession
        });

        packageDoc =
          packageDocQuery;
      }
    );


    // ===============================================
    // RE-FETCH WITH POPULATED DESTINATION
    // ===============================================

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
// No inventory reservation is made when M-Pesa starts.
//
// =========================================================

async function releasePaymentReservation(payment) {
  return;
}


module.exports = {
  recordPayment,
  confirmPackagePayment,
  releasePaymentReservation
};
