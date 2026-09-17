// =========================================================
// verrah/services/packageCustomerService.js
//
// VERRAH COSMETICS
// CUSTOMER PACKAGE SERVICE
// =========================================================

const mongoose = require("mongoose");

const Package = require("../../models/package");
const User = require("../../models/user");

const {
  SUBSTATION_VIEW_FIELDS,
  prepareSubstationForView,
  preparePackageDestination
} = require("./packageHelpers");

const {
  getUserId
} = require("../shopContext");


// =========================================================
// GET USER PACKAGES
// =========================================================

async function getUserPackages(req) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  const packages = await Package.find({
    clientId
  })
    .sort({
      createdAt: -1
    })
    .populate(
      "packageSubstation",
      SUBSTATION_VIEW_FIELDS
    )
    .lean();


  // ===============================================
  // FALLBACK PICKUP STATION
  // ===============================================

  const client = await User.findById(
    clientId
  )
    .select("_id pickupStation")
    .populate(
      "pickupStation",
      SUBSTATION_VIEW_FIELDS
    )
    .lean();

  const fallbackSubstation =
    prepareSubstationForView(
      client?.pickupStation || null
    );


  // ===============================================
  // PREPARE PACKAGES
  // ===============================================

  return packages.map((pkg) => {
    if (pkg.packageSubstation) {
      pkg.packageSubstation =
        prepareSubstationForView(
          pkg.packageSubstation
        );
    } else if (fallbackSubstation) {
      pkg.packageSubstation = {
        ...fallbackSubstation
      };
    } else {
      pkg.packageSubstation = null;
    }

    return pkg;
  });
}


// =========================================================
// GET USER PACKAGE
// =========================================================

async function getUserPackage(req, id) {
  const clientId = getUserId(req);

  if (!clientId) {
    throw new Error("Login is required.");
  }

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const packageDoc =
    await Package.findOne({
      _id: id,
      clientId
    })
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();

  if (!packageDoc) {
    return null;
  }

  await preparePackageDestination(
    packageDoc
  );

  return packageDoc;
}


module.exports = {
  getUserPackages,
  getUserPackage
};
