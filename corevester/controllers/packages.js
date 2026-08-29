// =========================================================
// controllers/packages.js
// =========================================================
const packageService = require("../services/packageService");

exports.list = async (req, res) => {
  try {
    const packages = await packageService.getUserPackages(req);

    res.render("packages/packages", {
      title: "My Packages | CoreVester",
      packages
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("packages/packages", {
      title: "My Packages | CoreVester",
      packages: [],
      error: "Unable to load your packages."
    });
  }
};

exports.details = async (req, res) => {
  try {
    const packageDoc = await packageService.getUserPackage(req, req.params.id);

    if (!packageDoc) {
      return res.status(404).render("packages/package-details", {
        title: "Package not found | CoreVester",
        packageDoc: null,
        error: "Package not found."
      });
    }

    res.render("packages/package-details", {
      title: `Package ${String(packageDoc._id).slice(-8)} | CoreVester`,
      packageDoc,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect("/packages");
  }
};
