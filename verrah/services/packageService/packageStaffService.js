// =========================================================
// verrah/services/packageStaffService.js
//
// VERRAH COSMETICS
// STAFF / ADMIN PACKAGE SERVICE
// =========================================================

const mongoose = require("mongoose");

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
    normalizeStatus(
      status
    );


  let visibleQuery = {};


  // =======================================================
  // STAFF VISIBILITY
  // =======================================================

  if (role === "staff") {

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
          status:
            "pending"
        },

        {
          confirmedByStaffId:
            id
        }

      ]

    };

  }


  // =======================================================
  // ADMIN VISIBILITY
  //
  // Admin can see all packages.
  // =======================================================

  // No filter is required for admin.


  // =======================================================
  // LOAD PACKAGES
  // =======================================================

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


  // =======================================================
  // PREPARE SUBSTATIONS
  // =======================================================

  allVisible.forEach(
    preparePackageSubstations
  );


  // =======================================================
  // COUNTS
  // =======================================================

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


  // =======================================================
  // STATUS FILTER
  // =======================================================

  const packages =
    status === "all"
      ? allVisible
      : allVisible.filter(
          (p) =>
            p.status === status
        );


  // =======================================================
  // CLIENT IDS
  // =======================================================

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


  // =======================================================
  // CLIENTS
  // =======================================================

  const clients =
    await User.find({

      _id: {
        $in:
          clientIds
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


  // =======================================================
  // RETURN
  // =======================================================

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
    !mongoose.isValidObjectId(
      id
    )
  ) {

    return null;

  }


  const pkg =
    await Package.findById(
      id
    )
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


  // =======================================================
  // STAFF VISIBILITY
  // =======================================================

  if (role === "staff") {

    const staffId =
      staffIdOf(req);


    if (
      pkg.status !== "pending" &&
      String(
        pkg.confirmedByStaffId || ""
      ) !==
      String(
        staffId || ""
      )
    ) {

      return null;

    }

  }


  // =======================================================
  // DESTINATION
  // =======================================================

  await preparePackageDestination(
    pkg
  );


  // =======================================================
  // CONFIRMED SUBSTATION
  // =======================================================

  if (
    pkg.confirmedSubstationId
  ) {

    pkg.confirmedSubstationId =
      prepareSubstationForView(
        pkg.confirmedSubstationId
      );

  }


  // =======================================================
  // DELIVERED SUBSTATION
  // =======================================================

  if (
    pkg.deliveredSubstationId
  ) {

    pkg.deliveredSubstationId =
      prepareSubstationForView(
        pkg.deliveredSubstationId
      );

  }


  // =======================================================
  // CLIENT
  // =======================================================

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


  // =======================================================
  // RETURN
  // =======================================================

  return addPackageFinancials({

    ...pkg,

    client

  });

}


// =========================================================
// CONFIRM PACKAGE
// =========================================================
//
// BOTH ADMIN AND STAFF CAN CONFIRM.
//
// IMPORTANT BUSINESS RULE:
//
// The confirmation substation is ALWAYS:
//
//     package.packageSubstation
//
// It is NEVER:
//
//     staff.assignedSubstation
//
// Therefore:
//
//     Admin confirmation
//         -> confirmedSubstationId = packageSubstation
//
//     Staff confirmation
//         -> confirmedSubstationId = packageSubstation
//
// =========================================================

async function confirmPackage(
  req,
  id
) {

  const role =
    roleOf(req);


  // =======================================================
  // ONLY ADMIN OR STAFF
  // =======================================================

  if (
    role !== "admin" &&
    role !== "staff"
  ) {

    throw new Error(
      "Staff or admin access required."
    );

  }


  // =======================================================
  // VALIDATE PACKAGE ID
  // =======================================================

  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {

    throw new Error(
      "Invalid package ID."
    );

  }


  // =======================================================
  // LOAD PENDING PACKAGE
  //
  // We load the package first because the confirmation
  // substation MUST come from packageSubstation.
  // =======================================================

  const packageDoc =
    await Package.findOne({

      _id:
        id,

      status:
        "pending"

    })
      .select(
        "_id status packageSubstation clientId items totalAmount totalPaid paidAmount phoneNumber"
      )
      .lean();


  if (!packageDoc) {

    throw new Error(
      "Package is no longer pending or does not exist."
    );

  }


  // =======================================================
  // PACKAGE SUBSTATION IS REQUIRED
  // =======================================================

  if (
    !packageDoc.packageSubstation
  ) {

    throw new Error(
      "This package has no package substation."
    );

  }


  // =======================================================
  // CONFIRMING USER
  // =======================================================

  const userId =
    staffIdOf(req);


  if (!userId) {

    throw new Error(
      "User identity is missing."
    );

  }


  const user =
    await User.findById(
      userId
    )
      .select(
        "_id name email role"
      )
      .lean();


  if (!user) {

    throw new Error(
      "User account not found."
    );

  }


  // =======================================================
  // CONFIRMING USER NAME
  // =======================================================

  const confirmerName =
    String(
      user.name ||
      user.email ||
      (
        role === "admin"
          ? "Admin"
          : "Staff"
      )
    ).trim();


  // =======================================================
  // CONFIRMATION SUBSTATION
  // =======================================================
  //
  // THIS IS THE IMPORTANT CHANGE.
  //
  // Always use:
  //
  //     packageDoc.packageSubstation
  //
  // Never:
  //
  //     user.assignedSubstation
  //
  // =======================================================

  const confirmationSubstationId =
    packageDoc.packageSubstation;


  // =======================================================
  // BUILD UPDATE
  // =======================================================

  const update = {

    $set: {

      status:
        "confirmed",

      confirmedAt:
        new Date(),

      confirmedSubstationId:
        confirmationSubstationId

    }

  };


  // =======================================================
  // STAFF CONFIRMATION
  // =======================================================
  //
  // Keep the existing staff confirmation information.
  //
  // This is still useful for determining which staff member
  // is responsible for delivery.
  //
  // =======================================================

  if (role === "staff") {

    update.$set.confirmedByStaffId =
      userId;

    update.$set.confirmedByStaffName =
      confirmerName;

  }


  // =======================================================
  // ADMIN CONFIRMATION
  // =======================================================
  //
  // Admin does not need a staff ID.
  //
  // Store admin identity separately when the corresponding
  // fields exist in the package schema.
  //
  // We only set these fields if the application already
  // supports them through Mongoose's strict schema handling.
  //
  // The essential confirmation field remains:
  //
  //     confirmedSubstationId
  //
  // =======================================================

  if (role === "admin") {

    update.$set.confirmedByAdminId =
      userId;

    update.$set.confirmedByAdminName =
      confirmerName;

  }


  // =======================================================
  // UPDATE PACKAGE
  // =======================================================

  const updated =
    await Package.findOneAndUpdate(

      {
        _id:
          id,

        status:
          "pending"

      },

      update,

      {
        new:
          true
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
      .populate(
        "deliveredSubstationId",
        SUBSTATION_VIEW_FIELDS
      )
      .lean();


  if (!updated) {

    throw new Error(
      "Package is no longer pending or does not exist."
    );

  }


  // =======================================================
  // PREPARE DESTINATION
  // =======================================================

  await preparePackageDestination(
    updated
  );


  // =======================================================
  // PREPARE CONFIRMED SUBSTATION
  // =======================================================

  if (
    updated.confirmedSubstationId
  ) {

    updated.confirmedSubstationId =
      prepareSubstationForView(
        updated.confirmedSubstationId
      );

  }


  // =======================================================
  // PREPARE DELIVERED SUBSTATION
  // =======================================================

  if (
    updated.deliveredSubstationId
  ) {

    updated.deliveredSubstationId =
      prepareSubstationForView(
        updated.deliveredSubstationId
      );

  }


  // =======================================================
  // CLIENT
  // =======================================================

  const client =
    await User.findById(
      updated.clientId
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
        updated.phoneNumber
      );

  }


  // =======================================================
  // RETURN
  // =======================================================

  return addPackageFinancials({

    ...updated,

    client

  });

}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

  getStaffPackages,

  getStaffPackage,

  confirmPackage

};