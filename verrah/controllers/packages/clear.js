// =========================================================
// verrah/controllers/packages/clear.js
// VERRAH COSMETICS - CLEAR DELIVERED PACKAGE
// =========================================================

const packageService =
  require("../../services/packageService");

const DeliveredPackage =
  require("../../models/delivered");

exports.clear = async (req, res) => {
  try {
    const role =
      String(req.user?.role || "").toLowerCase();

    const staffId =
      String(
        req.user?._id ||
        req.user?.id ||
        ""
      );

    if (role !== "staff" && role !== "admin") {
      throw new Error(
        "Staff or admin access required."
      );
    }

    const packageDoc =
      await packageService.getStaffPackage(
        req,
        req.params.id
      );

    if (!packageDoc) {
      throw new Error(
        "Package not found or not assigned to you."
      );
    }

    if (packageDoc.status !== "delivered") {
      throw new Error(
        "Only delivered packages can be cleared."
      );
    }

    const arrears =
      Math.max(
        0,
        Number(packageDoc.totalAmount || 0) -
        Number(packageDoc.paidAmount || 0)
      );

    if (arrears > 0) {
      throw new Error(
        "This package cannot be cleared while it has outstanding arrears."
      );
    }

    if (
      role === "staff" &&
      String(packageDoc.deliveredByStaffId || "") !== staffId
    ) {
      throw new Error(
        "Only the staff member who delivered this package can clear it."
      );
    }

    const deliveredRecord =
      await DeliveredPackage.findOne({
        packageId: packageDoc._id
      });

    if (!deliveredRecord) {
      throw new Error(
        "Delivered package record was not found."
      );
    }

    if (deliveredRecord.cleared) {
      throw new Error(
        "This package has already been cleared."
      );
    }

    deliveredRecord.cleared = true;
    deliveredRecord.clearedAt = new Date();
    deliveredRecord.clearedByStaffId = staffId;
    deliveredRecord.clearedByStaffName =
      String(
        req.user?.name ||
        req.user?.email ||
        "Staff"
      ).trim();

    await deliveredRecord.save();

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as cleared."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );
  }
};
