const packageService = require("../services/packageService");
const paymentService = require("../services/paymentService");
const confirmationService = require("../services/packageConfirmationService");
const DeliveredPackage = require("../models/delivered");

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

exports.staffList = async (req, res) => {
  const status = String(req.query.status || "all").toLowerCase();

  try {
    const result = await packageService.getStaffPackages(req, status);

    const packages = await Promise.all(
      result.packages.map(async (pkg) => ({
        ...pkg,
        confirmationState:
          pkg.status === "pending"
            ? await confirmationService.getConfirmationState(req, pkg._id)
            : { ok: false, message: "" }
      }))
    );

    res.render("packages/staff", {
      title: "Package Management | CoreVester",
      packages,
      status: ["all", "pending", "confirmed", "delivered"].includes(status)
        ? status
        : "all",
      role: req.user.role,
      counts: result.counts,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);

    res.status(500).render("packages/staff", {
      title: "Package Management | CoreVester",
      packages: [],
      status: ["all", "pending", "confirmed", "delivered"].includes(status)
        ? status
        : "all",
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

exports.staffDetails = async (req, res) => {
  try {
    const packageDoc = await packageService.getStaffPackage(
      req,
      req.params.id
    );

    if (!packageDoc) {
      return res.status(404).render("packages/staff-details", {
        title: "Package not found | CoreVester",
        packageDoc: null,
        role: req.user.role,
        user: req.user,
        canConfirm: false,
        cleared: false,
        confirmationError: "Package not found or not assigned to you.",
        error: "Package not found or not assigned to you."
      });
    }

    const confirmationState =
      packageDoc.status === "pending"
        ? await confirmationService.getConfirmationState(req, packageDoc._id)
        : { ok: false, message: "" };

    const deliveredRecord = await DeliveredPackage.findOne({
      packageId: packageDoc._id
    })
      .select("cleared clearedAt clearedByStaffId clearedByStaffName")
      .lean();

    res.render("packages/staff-details", {
      title: `Package ${String(packageDoc._id).slice(-8)} | Package Management`,
      packageDoc,
      role: req.user.role,
      user: req.user,
      canConfirm: confirmationState.ok,
      confirmationError: confirmationState.ok
        ? null
        : confirmationState.message,
      cleared: Boolean(deliveredRecord?.cleared),
      clearedAt: deliveredRecord?.clearedAt || null,
      clearedByStaffName: deliveredRecord?.clearedByStaffName || "",
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect("/packages/staff");
  }
};

exports.confirm = async (req, res) => {
  try {
    await confirmationService.confirmPackage(req, req.params.id);

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package confirmed and assigned to you."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`
    );
  }
};

exports.deliver = async (req, res) => {
  try {
    await packageService.deliverPackage(req, req.params.id);

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as delivered and the substation delivery ledger was updated."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`
    );
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const deliveredRecord = await DeliveredPackage.findOne({
      packageId: req.params.id
    })
      .select("cleared")
      .lean();

    if (deliveredRecord?.cleared) {
      throw new Error(
        "This package has already been cleared. No further payment entry is allowed."
      );
    }

    await packageService.recordPayment(
      req,
      req.params.id,
      req.body.amountPaid
    );

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Amount paid updated."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`
    );
  }
};

exports.clear = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const staffId = String(req.user?._id || req.user?.id || "");

    if (role !== "staff" && role !== "admin") {
      throw new Error("Staff or admin access required.");
    }

    const packageDoc = await packageService.getStaffPackage(
      req,
      req.params.id
    );

    if (!packageDoc) {
      throw new Error("Package not found or not assigned to you.");
    }

    if (packageDoc.status !== "delivered") {
      throw new Error("Only delivered packages can be cleared.");
    }

    const arrears = Math.max(
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

    const deliveredRecord = await DeliveredPackage.findOne({
      packageId: packageDoc._id
    });

    if (!deliveredRecord) {
      throw new Error("Delivered package record was not found.");
    }

    if (deliveredRecord.cleared) {
      throw new Error("This package has already been cleared.");
    }

    deliveredRecord.cleared = true;
    deliveredRecord.clearedAt = new Date();
    deliveredRecord.clearedByStaffId = staffId;
    deliveredRecord.clearedByStaffName =
      String(req.user?.name || req.user?.email || "Staff").trim();

    await deliveredRecord.save();

    return res.redirect(
      `/packages/staff/${req.params.id}?success=${encodeURIComponent(
        "Package marked as cleared."
      )}`
    );
  } catch (err) {
    console.error(err);

    return res.redirect(
      `/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`
    );
  }
};
