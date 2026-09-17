// =========================================================
// verrah/controllers/packages/recordPayment.js
// VERRAH COSMETICS - RECORD PACKAGE PAYMENT
// =========================================================

const packageService =
  require("../../services/packageService");

const DeliveredPackage =
  require("../../models/delivered");

exports.recordPayment = async (req, res) => {
  try {
    const deliveredRecord =
      await DeliveredPackage.findOne({
        packageId: req.params.id
      })
        .select("cleared")
        .lean();

    if (deliveredRecord?.cleared) {
      throw new Error(
        "This package has already been cleared. No further payment entry is allowed."
      );
    }

    await packageService.recordPayment(
      req,
      req.params.id,
      req.body.amountPaid
    );

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Amount paid updated."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};
