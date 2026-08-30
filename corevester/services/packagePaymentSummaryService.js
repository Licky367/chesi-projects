const Payment =
  require("../models/Payment");

const Package =
  require("../models/package");

const {
  getPaymentStatus
} =
  require("./packageService");

async function getPackagePaymentSummary(
  packageId
) {
  const packageDoc =
    await Package.findById(
      packageId
    ).lean();

  if (!packageDoc) {
    return null;
  }

  const aggregate =
    await Payment.aggregate([
      {
        $match: {
          packageId:
            packageDoc._id,

          status:
            "confirmed"
        }
      },

      {
        $group: {
          _id: null,

          totalPaid: {
            $sum: {
              $ifNull: [
                "$paidAmount",
                0
              ]
            }
          }
        }
      }
    ]);

  const totalAmount =
    Math.max(
      0,
      Number(
        packageDoc.totalAmount || 0
      )
    );

  const totalPaid =
    Math.max(
      0,
      Number(
        aggregate[0]?.totalPaid ||
        0
      )
    );

  const paidAmount =
    Math.min(
      totalPaid,
      totalAmount
    );

  const arrearsAmount =
    Math.max(
      0,
      totalAmount -
      paidAmount
    );

  return {
    totalAmount,

    totalPaid:
      paidAmount,

    paidAmount,

    arrearsAmount,

    paymentStatus:
      getPaymentStatus(
        totalAmount,
        paidAmount
      ),

    paymentMethod:
      packageDoc.paymentMethod,

    mpesaReceiptNumber:
      packageDoc.mpesaReceiptNumber ||
      ""
  };
}

module.exports = {
  getPackagePaymentSummary
};
