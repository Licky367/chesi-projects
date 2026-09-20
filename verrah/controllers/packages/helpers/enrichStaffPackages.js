// =========================================================
// verrah/controllers/packages/helpers/enrichStaffPackages.js
// VERRAH COSMETICS - STAFF PACKAGE ENRICHMENT
// =========================================================

const packageService =
  require("../../../services/packageService");

const confirmationService =
  require("../../../services/packageConfirmationService");

const User =
  require("../../../models/user");

async function getEnrichedStaffPackages(req, status) {
  const result = await packageService.getStaffPackages(req, status);

  const packages = Array.isArray(result.packages)
    ? result.packages
    : [];

  const clientIds = [
    ...new Set(
      packages
        .map((pkg) => pkg.clientId)
        .filter(Boolean)
        .map((id) => String(id))
    )
  ];

  const users = clientIds.length
    ? await User.find({
        _id: { $in: clientIds }
      })
        .select("_id role")
        .lean()
    : [];

  const roleMap = new Map(
    users.map((user) => [
      String(user._id),
      String(user.role || "").toLowerCase()
    ])
  );

  const enrichedPackages = await Promise.all(
    packages.map(async (pkg) => {
      const clientRole =
        roleMap.get(String(pkg.clientId)) || "";

const isDirectSell =
    clientRole === "staff" || clientRole === "admin";

      const confirmationState =
        pkg.status === "pending"
          ? await confirmationService.getConfirmationState(
              req,
              pkg._id
            )
          : {
              ok: false,
              message: ""
            };

      return {
        ...pkg,
        isDirectSell,
        clientRole,
        confirmationState
      };
    })
  );

  return {
    packages: enrichedPackages,
    counts: result.counts
  };
}

module.exports = getEnrichedStaffPackages;
