// =========================================================
// verrah/controllers/packages/details.js
// VERRAH COSMETICS - USER PACKAGE DETAILS
// =========================================================

const packageService = require("../../services/packageService");

exports.details = async (req, res) => {
  try {
    const packageDoc = await packageService.getUserPackage(
      req,
      req.params.id
    );

    if (!packageDoc) {
      return res.status(404).render("packages/package-details", {
        title: "Package not found | CoreVester",
        packageDoc: null,
        error: "Package not found."
      });
    }

    return res.render("packages/package-details", {
      title: `Package ${String(packageDoc._id).slice(-8)} | CoreVester`,
      packageDoc,
      error: req.query.error || null
    });
  } catch (err) {
    console.error(err);
    return res.status(404).redirect("/packages");
  }
};
