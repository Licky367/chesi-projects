// =========================================================
// verrah/controllers/packages/confirm.js
// VERRAH COSMETICS - CONFIRM PACKAGE
// =========================================================

const packageService =
  require("../../services/packageService");

exports.confirm = async (req, res) => {
  try {
    await packageService.confirmPackage(
      req,
      req.params.id
    );

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package confirmed and assigned to you."
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
