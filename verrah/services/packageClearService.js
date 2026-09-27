const mongoose = require("mongoose");

const Package = require("../../models/package");
const DeliveredPackage = require("../../models/delivered");

const {
    roleOf,
    staffIdOf
} = require("./packageHelpers");


async function clearPackage(req, id) {
    const role = roleOf(req);

    if (role !== "staff" && role !== "admin") {
        throw new Error("Staff or admin access required.");
    }

    if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid package.");
    }

    const staffId = staffIdOf(req);

    const actorName = String(
        req.user?.name ||
        req.user?.fullName ||
        req.user?.email ||
        (role === "admin" ? "Admin" : "Staff")
    ).trim();

    const packageDoc = await Package.findById(id).lean();

    if (!packageDoc) {
        throw new Error("Package not found.");
    }

    if (packageDoc.status !== "delivered") {
        throw new Error("Only delivered packages can be cleared.");
    }

    const totalAmount = Number(packageDoc.totalAmount || 0);
    const paidAmount = Number(
        packageDoc.paidAmount ??
        packageDoc.totalPaid ??
        0
    );

    const arrears = Math.max(
        0,
        totalAmount - paidAmount
    );

    if (arrears > 0) {
        throw new Error(
            "This package cannot be cleared while it has outstanding arrears."
        );
    }

    if (
        role === "staff" &&
        String(packageDoc.deliveredByStaffId || "") !==
        String(staffId || "")
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
    deliveredRecord.clearedByStaffId = staffId || null;
    deliveredRecord.clearedByStaffName = actorName;

    await deliveredRecord.save();

    return deliveredRecord;
}


module.exports = {
    clearPackage
};
