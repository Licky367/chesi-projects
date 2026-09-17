// =========================================================
// verrah/controllers/packages/pay.js
// VERRAH COSMETICS - PACKAGE PAYMENT
// =========================================================

const paymentService = require("../../services/paymentService");

exports.pay = async (req, res) => {
  try {
    const result = await paymentService.initiatePackageStkPush(
      req,
      req.params.id,
      req.body.phoneNumber
    );

    return res.redirect(`/carts/payment/${result.paymentId}`);
  } catch (err) {
    console.error("Package M-Pesa payment error:", err);

    return res.redirect(
      `/packages/${req.params.id}?error=${encodeURIComponent(err.message)}`
    );
  }
};
