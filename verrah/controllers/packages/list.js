// =========================================================
// verrah/controllers/packages/list.js
// VERRAH COSMETICS - USER PACKAGE LIST
// =========================================================

const packageService = require("../../services/packageService");

exports.list = async (req, res) => {
  try {
    const packages = await packageService.getUserPackages(req);

    return res.render("packages/packages", {
      title: "My Packages | CoreVester",
      packages,
      error: null
    });
  } catch (err) {
    console.error(err);

    return res.status(500).render("packages/packages", {
      title: "My Packages | CoreVester",
      packages: [],
      error: "Unable to load your packages."
    });
  }
};
