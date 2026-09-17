// =========================================================
// verrah/controllers/packages/deliver.js
// VERRAH COSMETICS - DELIVER PACKAGE
// =========================================================

const packageService =
  require("../../services/packageService");

exports.deliver = async (req, res) => {
  try {
    await packageService.deliverPackage(
      req,
      req.params.id
    );

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as delivered and the substation delivery ledger was updated."
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
