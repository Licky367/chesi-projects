const mongoose = require("mongoose");

const {
  getPackagePaymentSummary
} = require("../services/packagePaymentService");

exports.summary = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid package."
      });
    }

    const summary =
      await getPackagePaymentSummary(req.params.id);

    if (!summary) {
      return res.status(404).json({
        ok: false,
        message: "Package not found."
      });
    }

    return res.json({
      ok: true,
      ...summary
    });
  } catch (err) {
    console.error(
      "Package payment summary error:",
      err
    );

    return res.status(500).json({
      ok: false,
      message: "Unable to load payment summary."
    });
  }
};
