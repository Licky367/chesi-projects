const mongoose =
  require("mongoose");

const packageService =
  require("../services/packageService");

const {
  getPackagePaymentSummary
} =
  require("../services/packagePaymentSummaryService");

const {
  createVerification,
  submitTransactionQuery,
  cleanTransactionCode
} =
  require("../services/mpesaTransactionService");

const MpesaVerification =
  require("../models/MpesaVerification");

function getUserId(req) {
  return String(
    req.user?._id ||
    req.user?.id ||
    ""
  );
}

exports.verify =
  async (req, res) => {
    try {
      if (
        !mongoose.isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "Invalid package."
        });
      }

      const clientId =
        getUserId(req);

      if (!clientId) {
        return res.status(401).json({
          ok: false,
          message:
            "Login is required."
        });
      }

      const code =
        cleanTransactionCode(
          req.body.transactionCode
        );

      if (!code) {
        return res.status(400).json({
          ok: false,
          message:
            "Enter the M-Pesa transaction code."
        });
      }

      const verification =
        await createVerification({
          packageId:
            req.params.id,

          clientId,

          transactionCode:
            code
        });

      const response =
        await submitTransactionQuery(
          verification
        );

      return res.json({
        ok: true,

        pending: true,

        verificationId:
          verification._id,

        transactionCode:
          verification.transactionCode,

        message:
          response.ResponseDescription ||
          "Transaction submitted for M-Pesa verification."
      });
    } catch (err) {
      console.error(
        "Package transaction verification:",
        err
      );

      return res.status(400).json({
        ok: false,
        message:
          err.message ||
          "Unable to verify the M-Pesa transaction."
      });
    }
  };

exports.status =
  async (req, res) => {
    try {
      const clientId =
        getUserId(req);

      if (!clientId) {
        return res.status(401).json({
          ok: false,
          message:
            "Login is required."
        });
      }

      const packageDoc =
        await packageService.getUserPackage(
          req,
          req.params.id
        );

      if (!packageDoc) {
        return res.status(404).json({
          ok: false,
          message:
            "Package not found."
        });
      }

      const summary =
        await getPackagePaymentSummary(
          packageDoc._id
        );

      const latest =
        await MpesaVerification.findOne({
          packageId:
            packageDoc._id,

          clientId
        })
          .sort({
            updatedAt: -1
          })
          .lean();

      return res.json({
        ok: true,

        totalAmount:
          summary.totalAmount,

        totalPaid:
          summary.totalPaid,

        paidAmount:
          summary.paidAmount,

        arrearsAmount:
          summary.arrearsAmount,

        paymentStatus:
          summary.paymentStatus,

        verification:
          latest
            ? {
                status:
                  latest.status,

                transactionCode:
                  latest.transactionCode,

                amount:
                  latest.amount,

                message:
                  latest.resultDescription ||
                  ""
              }
            : null
      });
    } catch (err) {
      console.error(
        "Package payment status:",
        err
      );

      return res.status(500).json({
        ok: false,
        message:
          "Unable to check payment status."
      });
    }
  };
