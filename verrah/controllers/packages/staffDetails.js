// =========================================================
// verrah/controllers/packages/staffDetails.js
// VERRAH COSMETICS - STAFF PACKAGE DETAILS
// =========================================================

const packageService =
  require("../../services/packageService");

const confirmationService =
  require("../../services/packageConfirmationService");

const DeliveredPackage =
  require("../../models/delivered");

const getEnrichedStaffPackages =
  require("./helpers/enrichStaffPackages");

exports.staffDetails = async (req, res) => {
  try {
    const packageDoc =
      await packageService.getStaffPackage(
        req,
        req.params.id
      );

    if (!packageDoc) {
      return res.status(404).render(
        "packages/staff-details",
        {
          title: "Package not found | CoreVester",
          packageDoc: null,
          role: req.user.role,
          user: req.user,
          canConfirm: false,
          cleared: false,
          confirmationError:
            "Package not found or not assigned to you.",
          error:
            "Package not found or not assigned to you."
        }
      );
    }

    const { packages: enrichedPackages } =
      await getEnrichedStaffPackages(req, "all");

    const enrichedPackage =
      enrichedPackages.find(
        (pkg) =>
          String(pkg._id) === String(packageDoc._id)
      );

    if (enrichedPackage) {
      packageDoc.isDirectSell =
        enrichedPackage.isDirectSell;

      packageDoc.clientRole =
        enrichedPackage.clientRole;
    }

    const confirmationState =
      packageDoc.status === "pending"
        ? await confirmationService.getConfirmationState(
            req,
            packageDoc._id
          )
        : {
            ok: false,
            message: ""
          };

    const deliveredRecord =
      await DeliveredPackage.findOne({
        packageId: packageDoc._id
      })
        .select(
          "cleared clearedAt clearedByStaffId clearedByStaffName"
        )
        .lean();

    return res.render("packages/staff-details", {
      title:
        `Package ${String(packageDoc._id).slice(-8)} | Package Management`,
      packageDoc,
      role: req.user.role,
      user: req.user,
      canConfirm: confirmationState.ok,
      confirmationError:
        confirmationState.ok
          ? null
          : confirmationState.message,
      cleared: Boolean(deliveredRecord?.cleared),
      clearedAt: deliveredRecord?.clearedAt || null,
      clearedByStaffName:
        deliveredRecord?.clearedByStaffName || "",
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);

    return res.status(404).redirect("/packages/staff");
  }
};
