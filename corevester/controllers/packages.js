// =========================================================
// controllers/packages.js
// =========================================================
const packageService = require("../services/packageService");
const paymentService = require("../services/paymentService");

exports.list = async (req, res) => {
  try {
    const packages = await packageService.getUserPackages(req);

    res.render("packages/packages", {
      title: "My Packages | CoreVester",
      packages,
      error: null
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

    res.render("packages/package-details", {
      title: `Package ${String(packageDoc._id).slice(-8)} | CoreVester`,
      packageDoc,
      error: req.query.error || null
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect("/packages");
  }
};

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
