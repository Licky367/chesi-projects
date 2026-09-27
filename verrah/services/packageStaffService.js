// =========================================================
// verrah/services/packageStaffService.js
//
// VERRAH COSMETICS
// STAFF PACKAGE SERVICE
// =========================================================

const mongoose =
  require("mongoose");

const Package =
  require("../../models/package");

const User =
  require("../../models/user");

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


// =========================================================
// GET STAFF PACKAGES
// =========================================================

async function getStaffPackages(
  req,
  status = "all"
) {

  const role =
    roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Staff or admin access required."
    );
  }

  status =
    normalizeStatus(status);

  let visibleQuery = {};


// =========================================================
// STAFF VISIBILITY
// =========================================================

  if (role === "staff") {

    const id =
      staffIdOf(req);

    if (!id) {
      throw new Error(
        "Staff identity is missing."
      );
    }

    // Pending packages are restricted by
    // packageSubstationAccess.filterStaffList.
    // Confirmed and delivered packages remain visible to
    // authorized staff regardless of who confirmed or delivered.
    visibleQuery = {};
  }


// =========================================================
// LOAD PACKAGES
// =========================================================

  const allVisible =
    await Package.find(
      visibleQuery
    )
      .sort({
        createdAt: -1
      })
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "deliveredSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


// =========================================================
// PREPARE SUBSTATIONS
// =========================================================

  allVisible.forEach(
    preparePackageSubstations
  );


// =========================================================
// COUNTS
// =========================================================

  const counts = {

    all:
      allVisible.length,

    pending:
      allVisible.filter(
        (p) =>
          p.status === "pending"
      ).length,

    confirmed:
      allVisible.filter(
        (p) =>
          p.status === "confirmed"
      ).length,

    delivered:
      allVisible.filter(
        (p) =>
          p.status === "delivered"
      ).length
  };


// =========================================================
// STATUS FILTER
// =========================================================

  const packages =
    status === "all"
      ? allVisible
      : allVisible.filter(
          (p) =>
            p.status === status
        );


// =========================================================
// CLIENT IDS
// =========================================================

  const clientIds = [
    ...new Set(
      packages
        .map(
          (p) =>
            String(
              p.clientId
            )
        )
        .filter(Boolean)
    )
  ];


// =========================================================
// CLIENTS
// =========================================================

  const clients =
    await User.find({
      _id: {
        $in: clientIds
      }
    })
      .select(
        "_id name email phone"
      )
      .lean();


  const clientMap =
    new Map(
      clients.map(
        (client) => [
          String(
            client._id
          ),
          {
            ...client,
            phone:
              normalizePhone(
                client.phone
              )
          }
        ]
      )
    );


// =========================================================
// RETURN
// =========================================================

  return {

    packages:
      packages.map(
        (pkg) => {

          const client =
            clientMap.get(
              String(
                pkg.clientId
              )
            ) || null;


          if (client) {

            client.phone =
              normalizePhone(
                client.phone
              ) ||
              normalizePhone(
                pkg.phoneNumber
              );
          }


          return addPackageFinancials({
            ...pkg,
            client
          });
        }
      ),

    counts
  };
}


// =========================================================
// GET STAFF PACKAGE
// =========================================================

async function getStaffPackage(
  req,
  id
) {

  const role =
    roleOf(req);

  if (
    role !== "staff" &&
    role !== "admin"
  ) {
    throw new Error(
      "Staff or admin access required."
    );
  }

  if (
    !mongoose.isValidObjectId(id)
  ) {
    return null;
  }


  const pkg =
    await Package.findById(id)
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "deliveredSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!pkg) {
    return null;
  }


// =========================================================
// STAFF VISIBILITY
// =========================================================

  // Pending package access is enforced by
  // packageSubstationAccess.guardStaffDetails.
  // Confirmed and delivered packages have no confirmer or
  // deliverer ownership restriction here.



// =========================================================
// DESTINATION
// =========================================================

  await preparePackageDestination(
    pkg
  );


// =========================================================
// CONFIRMED SUBSTATION
// =========================================================

  if (
    pkg.confirmedSubstationId
  ) {

    pkg.confirmedSubstationId =
      prepareSubstationForView(
        pkg.confirmedSubstationId
      );
  }


// =========================================================
// DELIVERED SUBSTATION
// =========================================================

  if (
    pkg.deliveredSubstationId
  ) {

    pkg.deliveredSubstationId =
      prepareSubstationForView(
        pkg.deliveredSubstationId
      );
  }


// =========================================================
// CLIENT
// =========================================================

  const client =
    await User.findById(
      pkg.clientId
    )
      .select(
        "_id name email phone"
      )
      .lean();


  if (client) {

    client.phone =
      normalizePhone(
        client.phone
      ) ||
      normalizePhone(
        pkg.phoneNumber
      );
  }


// =========================================================
// RETURN
// =========================================================

  return addPackageFinancials({
    ...pkg,
    client
  });
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  getStaffPackages,
  getStaffPackage
};
