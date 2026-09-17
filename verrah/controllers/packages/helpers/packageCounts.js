// =========================================================
// verrah/controllers/packages/helpers/packageCounts.js
// VERRAH COSMETICS - PACKAGE COUNTS
// =========================================================

function getPackageCounts(packages) {
  return {
    all: packages.length,

    pending: packages.filter(
      (pkg) => pkg.status === "pending"
    ).length,

    confirmed: packages.filter(
      (pkg) => pkg.status === "confirmed"
    ).length,

    delivered: packages.filter(
      (pkg) => pkg.status === "delivered"
    ).length
  };
}

module.exports = getPackageCounts;
