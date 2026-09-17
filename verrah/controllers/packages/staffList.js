// =========================================================
// verrah/controllers/packages/staffList.js
// VERRAH COSMETICS - STAFF PACKAGE LIST
// =========================================================

const getEnrichedStaffPackages =
  require("./helpers/enrichStaffPackages");

const getPackageCounts =
  require("./helpers/packageCounts");

exports.staffList = async (req, res) => {
  const requestedStatus =
    String(req.query.status || "all").toLowerCase();

  const allowedStatuses = [
    "all",
    "pending",
    "confirmed",
    "delivered"
  ];

  const status =
    allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : "all";

  try {
    const { packages: enrichedPackages } =
      await getEnrichedStaffPackages(req, status);

    const packages = enrichedPackages.filter(
      (pkg) => pkg.isDirectSell === false
    );

    const counts = getPackageCounts(packages);

    return res.render("packages/staff", {
      title: "Package Management | CoreVester",
      packages,
      status,
      role: req.user.role,
      counts,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);

    return res.status(500).render("packages/staff", {
      title: "Package Management | CoreVester",
      packages: [],
      status,
      role: req.user.role,
      counts: {
        all: 0,
        pending: 0,
        confirmed: 0,
        delivered: 0
      },
      error: err.message,
      success: null
    });
  }
};
