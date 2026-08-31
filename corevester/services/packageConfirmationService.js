const mongoose = require("mongoose");
const Package = require("../models/package");
const Product = require("../models/products");
const Substation = require("../models/substations");
const User = require("../models/user");

function staffIdOf(req) {
  return String(req.user?._id || req.user?.id || "");
}

async function getStaffAssignment(req) {
  const staffId = staffIdOf(req);
  if (!staffId) throw new Error("Staff account not found.");
  const staff = await User.findOne({ _id: staffId, role: "staff" })
    .select("_id assignedSubstation")
    .lean();
  if (!staff) throw new Error("Staff account not found.");
  if (!staff.assignedSubstation) {
    throw new Error("You must have an assigned substation before confirming packages.");
  }
  return staff;
}

async function checkPackageAvailability(packageId, substationId, dbSession = null) {
  const pkgQuery = Package.findOne({ _id: packageId, status: "pending" });
  const substationQuery = Substation.findOne({ _id: substationId, isActive: true });
  if (dbSession) {
    pkgQuery.session(dbSession);
    substationQuery.session(dbSession);
  }
  const [pkg, substation] = await Promise.all([pkgQuery, substationQuery]);
  if (!pkg) return { ok: false, message: "Package is no longer pending or does not exist." };
  if (!substation) return { ok: false, message: "The assigned substation does not exist or is inactive." };

  const productIds = pkg.items.map((item) => item.productId).filter(Boolean);
  const productsQuery = Product.find({ _id: { $in: productIds }, isActive: true });
  if (dbSession) productsQuery.session(dbSession);
  const products = await productsQuery.lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  for (const item of pkg.items) {
    const product = productMap.get(String(item.productId));
    if (!product) {
      return { ok: false, message: `Product ${item.name} is no longer active.` };
    }
    const inventory = (substation.productInventory || []).find(
      (entry) => String(entry.productId) === String(item.productId)
    );
    const available = Number(inventory?.units || 0);
    const required = Number(item.qty || 0);
    if (required > available) {
      return {
        ok: false,
        message: `${substation.name} has ${available} units of ${item.name}, but the package requires ${required}.`
      };
    }
  }

  return { ok: true, package: pkg, substation };
}

exports.getConfirmationState = async (req, packageId) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "staff") return { ok: false, message: "Only staff can confirm packages." };
  try {
    const staff = await getStaffAssignment(req);
    return checkPackageAvailability(packageId, staff.assignedSubstation);
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

exports.confirmPackage = async (req, packageId) => {
  if (String(req.user?.role || "").toLowerCase() !== "staff") {
    throw new Error("Only staff can confirm packages.");
  }

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const staff = await getStaffAssignment(req);
      const state = await checkPackageAvailability(
        packageId,
        staff.assignedSubstation,
        session
      );
      if (!state.ok) throw new Error(state.message);

      const staffName = String(req.user.name || req.user.email || "Staff").trim();
      updated = await Package.findOneAndUpdate(
        { _id: packageId, status: "pending" },
        {
          $set: {
            status: "confirmed",
            confirmedByStaffId: staff._id,
            confirmedByStaffName: staffName,
            confirmedAt: new Date(),
            confirmedSubstationId: staff.assignedSubstation
          }
        },
        { new: true, session }
      ).lean();

      if (!updated) throw new Error("Package is no longer pending or does not exist.");
    });
    return updated;
  } finally {
    await session.endSession();
  }
};
