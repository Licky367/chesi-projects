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

  if (
    role === "staff"
  ) {

    const id =
      staffIdOf(req);


    if (!id) {
      throw new Error(
        "Staff identity is missing."
      );
    }


    visibleQuery = {
      $or: [
        {
          status: "pending"
        },
        {
          confirmedByStaffId: id
        }
      ]
    };
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

  if (
    role === "staff"
  ) {

    const staffId =
      staffIdOf(req);


    if (
      pkg.status !== "pending" &&
      String(
        pkg.confirmedByStaffId || ""
      ) !== String(
        staffId || ""
      )
    ) {
      return null;
    }
  }


// =========================================================
// DESTINATION
// =========================================================

  await preparePackageDestination(
    pkg
  );


// =========================================================
// OTHER SUBSTATIONS
// =========================================================

  if (
    pkg.confirmedSubstationId
  ) {

    pkg.confirmedSubstationId =
      prepareSubstationForView(
        pkg.confirmedSubstationId
      );
  }


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
// CONFIRM PACKAGE
// =========================================================
//
// IMPORTANT:
// ---------------------------------------------------------
// The package destination is packageSubstation.
//
// Confirmation must NOT replace that destination with the
// confirming staff member's assignedSubstation.
//
// confirmedSubstationId is therefore recorded from:
//     packageSubstation
//
// The staff member's assignedSubstation is not used as the
// package destination.
// =========================================================

async function confirmPackage(
  req,
  id
) {

  if (
    roleOf(req) !== "staff"
  ) {
    throw new Error(
      "Only staff can confirm packages."
    );
  }


  const staffId =
    staffIdOf(req);


  const staffName =
    String(
      req.user?.name ||
      req.user?.email ||
      "Staff"
    ).trim();


// =========================================================
// LOAD PACKAGE FIRST
// =========================================================

  const existing =
    await Package.findOne({
      _id: id,
      status: "pending"
    })
      .select(
        "_id status packageSubstation"
      )
      .lean();


  if (!existing) {
    throw new Error(
      "Package is no longer pending or does not exist."
    );
  }


// =========================================================
// PACKAGE SUBSTATION IS REQUIRED
// =========================================================

  if (
    !existing.packageSubstation
  ) {
    throw new Error(
      "This package has no package substation."
    );
  }


// =========================================================
// CONFIRM PACKAGE
// =========================================================
//
// confirmedSubstationId is deliberately taken from
// packageSubstation.
//
// Do NOT use:
//     staff.assignedSubstation
//
// =========================================================

  const updated =
    await Package.findOneAndUpdate(
      {
        _id: id,
        status: "pending"
      },
      {
        $set: {

          status:
            "confirmed",

          confirmedByStaffId:
            staffId,

          confirmedByStaffName:
            staffName,

          confirmedAt:
            new Date(),

          confirmedSubstationId:
            existing.packageSubstation
        }
      },
      {
        new: true
      }
    )
      .populate(
        "packageSubstation",
        SUBSTATION_VIEW_FIELDS
      )
      .populate(
        "confirmedSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!updated) {
    throw new Error(
      "Package is no longer pending or does not exist."
    );
  }


// =========================================================
// PREPARE DESTINATION
// =========================================================

  await preparePackageDestination(
    updated
  );


// =========================================================
// PREPARE CONFIRMED SUBSTATION
// =========================================================

  if (
    updated.confirmedSubstationId
  ) {

    updated.confirmedSubstationId =
      prepareSubstationForView(
        updated.confirmedSubstationId
      );
  }


// =========================================================
// RETURN
// =========================================================

  return updated;
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

  getStaffPackages,

  getStaffPackage,

  confirmPackage
};