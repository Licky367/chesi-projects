// =========================================================
// verrah/services/packageStaffService.js
// FIXED - includes deliver + allows admin-confirmed to be delivered by staff
// =========================================================

const mongoose = require("mongoose");
const Package = require("../../models/package");
const User = require("../../models/user");
const {
  SUBSTATION_VIEW_FIELDS,
  preparePackageDestination,
  preparePackageSubstations,
  prepareSubstationForView,
  normalizeStatus,
  normalizePhone,
  roleOf,
  staffIdOf,
  addPackageFinancials
} = require("./packageHelpers");

async function getStaffPackages(req, status = "all") {
  const role = roleOf(req);
  if (role !== "staff" && role !== "admin") throw new Error("Staff or admin access required.");
  status = normalizeStatus(status);

  let visibleQuery = {};
  if (role === "staff") {
    const id = staffIdOf(req);
    if (!id) throw new Error("Staff identity is missing.");
    // FIXED: staff sees pending + confirmed + delivered, not just own
    visibleQuery = {
      $or: [{ status: "pending" }, { status: "confirmed" }, { status: "delivered" }, { confirmedByStaffId: id }]
    };
  }

  const allVisible = await Package.find(visibleQuery)
    .sort({ createdAt: -1 })
    .populate("packageSubstation", SUBSTATION_VIEW_FIELDS)
    .populate("confirmedSubstationId", SUBSTATION_VIEW_FIELDS)
    .populate("deliveredSubstationId", SUBSTATION_VIEW_FIELDS)
    .lean();

  allVisible.forEach(preparePackageSubstations);

  const counts = {
    all: allVisible.length,
    pending: allVisible.filter((p) => p.status === "pending").length,
    confirmed: allVisible.filter((p) => p.status === "confirmed").length,
    delivered: allVisible.filter((p) => p.status === "delivered").length
  };

  const packages = status === "all" ? allVisible : allVisible.filter((p) => p.status === status);
  const clientIds = [...new Set(packages.map((p) => String(p.clientId)).filter(Boolean))];
  const clients = await User.find({ _id: { $in: clientIds } }).select("_id name email phone").lean();
  const clientMap = new Map(clients.map((client) => [String(client._id), { ...client, phone: normalizePhone(client.phone) }]));

  return {
    packages: packages.map((pkg) => {
      const client = clientMap.get(String(pkg.clientId)) || null;
      if (client) client.phone = normalizePhone(client.phone) || normalizePhone(pkg.phoneNumber);
      return addPackageFinancials({ ...pkg, client });
    }),
    counts
  };
}

async function getStaffPackage(req, id) {
  const role = roleOf(req);
  if (role !== "staff" && role !== "admin") throw new Error("Staff or admin access required.");
  if (!mongoose.isValidObjectId(id)) return null;

  const pkg = await Package.findById(id)
    .populate("packageSubstation", SUBSTATION_VIEW_FIELDS)
    .populate("confirmedSubstationId", SUBSTATION_VIEW_FIELDS)
    .populate("deliveredSubstationId", SUBSTATION_VIEW_FIELDS)
    .lean();
  if (!pkg) return null;

  // FIXED: removed old check that returned null for admin-confirmed packages
  await preparePackageDestination(pkg);
  if (pkg.confirmedSubstationId) pkg.confirmedSubstationId = prepareSubstationForView(pkg.confirmedSubstationId);
  if (pkg.deliveredSubstationId) pkg.deliveredSubstationId = prepareSubstationForView(pkg.deliveredSubstationId);

  const client = await User.findById(pkg.clientId).select("_id name email phone").lean();
  if (client) client.phone = normalizePhone(client.phone) || normalizePhone(pkg.phoneNumber);

  return addPackageFinancials({ ...pkg, client });
}

async function confirmPackage(req, id) {
  const role = roleOf(req);
  if (role !== "admin" && role !== "staff") throw new Error("Staff or admin access required.");
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid package ID.");

  const packageDoc = await Package.findOne({ _id: id, status: "pending" })
    .select("_id status packageSubstation clientId phoneNumber").lean();
  if (!packageDoc) throw new Error("Package is no longer pending or does not exist.");
  if (!packageDoc.packageSubstation) throw new Error("This package has no package substation.");

  const userId = staffIdOf(req);
  if (!userId) throw new Error("User identity is missing.");
  const user = await User.findById(userId).select("_id name email role").lean();
  if (!user) throw new Error("User account not found.");

  const confirmerName = String(user.name || user.email || (role === "admin" ? "Admin" : "Staff")).trim();

  const updated = await Package.findOneAndUpdate(
    { _id: id, status: "pending" },
    {
      $set: {
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedSubstationId: packageDoc.packageSubstation,
        confirmedByStaffId: userId,
        confirmedByStaffName: confirmerName,
        confirmedByRole: role
      }
    },
    { new: true }
  )
    .populate("packageSubstation", SUBSTATION_VIEW_FIELDS)
    .populate("confirmedSubstationId", SUBSTATION_VIEW_FIELDS)
    .populate("deliveredSubstationId", SUBSTATION_VIEW_FIELDS)
    .lean();

  if (!updated) throw new Error("Package is no longer pending or does not exist.");
  await preparePackageDestination(updated);
  if (updated.confirmedSubstationId) updated.confirmedSubstationId = prepareSubstationForView(updated.confirmedSubstationId);
  if (updated.deliveredSubstationId) updated.deliveredSubstationId = prepareSubstationForView(updated.deliveredSubstationId);

  const client = await User.findById(updated.clientId).select("_id name email phone").lean();
  if (client) client.phone = normalizePhone(client.phone) || normalizePhone(updated.phoneNumber);
  return addPackageFinancials({ ...updated, client });
}

// THIS WAS MISSING - THIS IS WHY DELIVER WAS NOT GOING THROUGH
async function deliverPackage(req, id) {
  const role = roleOf(req);
  if (role !== "admin" && role !== "staff") throw new Error("Staff or admin access required.");
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid package ID.");

  const userId = staffIdOf(req);
  if (!userId) throw new Error("User identity is missing.");

  const pkg = await Package.findById(id).select("_id status packageSubstation").lean();
  if (!pkg) throw new Error("Package not found");
  if (pkg.status !== "confirmed") throw new Error("Package must be confirmed first");
  if (!pkg.packageSubstation) throw new Error("Package has no package substation");

  const user = await User.findById(userId).select("name email").lean();
  const delivererName = String(user?.name || user?.email || (role === "admin" ? "Admin" : "Staff")).trim();

  const updated = await Package.findOneAndUpdate(
    { _id: id, status: "confirmed" },
    {
      $set: {
        status: "delivered",
        deliveredAt: new Date(),
        deliveredSubstationId: pkg.packageSubstation,
        deliveredByStaffId: userId,
        deliveredByStaffName: delivererName,
        deliveredByRole: role
      }
    },
    { new: true }
  )
    .populate("packageSubstation", SUBSTATION_VIEW_FIELDS)
    .populate("confirmedSubstationId", SUBSTATION_VIEW_FIELDS)
    .populate("deliveredSubstationId", SUBSTATION_VIEW_FIELDS)
    .lean();

  if (!updated) throw new Error("Package is no longer confirmed or does not exist");
  await preparePackageDestination(updated);
  return addPackageFinancials(updated);
}

module.exports = {
  getStaffPackages,
  getStaffPackage,
  confirmPackage,
  deliverPackage
};