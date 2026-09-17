// =========================================================
// verrah/services/packageHelpers.js
//
// VERRAH COSMETICS
// PACKAGE HELPERS
// =========================================================

const Payment = require("../../models/Payment");
const User = require("../../models/user");


// =========================================================
// SUBSTATION VIEW FIELDS
// =========================================================
//
// packageSubstation is the customer's selected pickup
// destination.
//
// directions = human-readable directions stored in the
// Substation document.
//
// gps remains separate.
//
// =========================================================

const SUBSTATION_VIEW_FIELDS = [
  "name",
  "location",
  "phoneNumber",
  "substationIcon",
  "description",
  "directions",
  "gps"
].join(" ");


// =========================================================
// PAYMENT STATUS
// =========================================================

function getPaymentStatus(totalAmount, totalPaid) {
  const total = Math.max(0, Number(totalAmount || 0));
  const paid = Math.max(0, Number(totalPaid || 0));

  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";

  return "partialPaid";
}


// =========================================================
// CONFIRMED PAYMENT TOTAL
// =========================================================

async function getConfirmedPaymentTotal(packageId, dbSession = null) {
  const aggregate = Payment.aggregate([
    {
      $match: {
        packageId,
        status: "confirmed"
      }
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: {
            $ifNull: ["$paidAmount", 0]
          }
        }
      }
    }
  ]);

  if (dbSession) {
    aggregate.session(dbSession);
  }

  const result = await aggregate;

  return Math.max(
    0,
    Number(result[0]?.totalPaid || 0)
  );
}


// =========================================================
// ROLE HELPERS
// =========================================================

function roleOf(req) {
  return String(req.user?.role || "").toLowerCase();
}


function staffIdOf(req) {
  return String(
    req.user?._id ||
    req.user?.id ||
    ""
  );
}


// =========================================================
// STATUS NORMALIZER
// =========================================================

function normalizeStatus(status) {
  return [
    "all",
    "pending",
    "confirmed",
    "delivered"
  ].includes(status)
    ? status
    : "all";
}


// =========================================================
// PHONE NORMALIZER
// =========================================================

function normalizePhone(phone) {
  if (phone === undefined || phone === null) {
    return "";
  }

  const value = String(phone).trim();

  if (!value || value === "_" || value === "—") {
    return "";
  }

  return value;
}


// =========================================================
// SALES NAME NORMALIZER
// =========================================================

function normalizeSalesName(salesName) {
  if (salesName === undefined || salesName === null) {
    return "";
  }

  const value = String(salesName).trim();

  if (!value) return "";

  if (value.length > 150) {
    throw new Error(
      "Sales name cannot exceed 150 characters."
    );
  }

  return value;
}


// =========================================================
// PREPARE SUBSTATION FOR VIEW
// =========================================================

function prepareSubstationForView(substation) {
  if (!substation) {
    return null;
  }

  const prepared = {
    ...substation
  };

  prepared.directions =
    typeof prepared.directions === "string"
      ? prepared.directions.trim()
      : (
          prepared.directions === undefined ||
          prepared.directions === null
            ? ""
            : String(prepared.directions).trim()
        );

  if (
    prepared.gps &&
    typeof prepared.gps === "object"
  ) {
    prepared.gps = {
      ...prepared.gps
    };
  } else {
    prepared.gps = null;
  }

  return prepared;
}


// =========================================================
// PREPARE PACKAGE DESTINATION
// =========================================================
//
// Priority:
//
// 1. Package.packageSubstation
// 2. Customer User.pickupStation for older packages
//
// NEVER use req.user.assignedSubstation here.
//
// =========================================================

async function preparePackageDestination(
  packageDoc,
  dbSession = null
) {
  if (!packageDoc) {
    return null;
  }

  if (packageDoc.packageSubstation) {
    packageDoc.packageSubstation =
      prepareSubstationForView(
        packageDoc.packageSubstation
      );

    return packageDoc.packageSubstation;
  }

  if (!packageDoc.clientId) {
    packageDoc.packageSubstation = null;
    return null;
  }

  let query = User.findById(packageDoc.clientId)
    .select("_id pickupStation")
    .populate(
      "pickupStation",
      SUBSTATION_VIEW_FIELDS
    );

  if (dbSession) {
    query = query.session(dbSession);
  }

  const client = await query.lean();

  packageDoc.packageSubstation =
    prepareSubstationForView(
      client?.pickupStation || null
    );

  return packageDoc.packageSubstation;
}


// =========================================================
// GET CLIENT
// =========================================================

async function getClient(clientId, dbSession = null) {
  let query = User.findById(clientId)
    .select(
      "_id name email phone pickupStation"
    )
    .populate(
      "pickupStation",
      SUBSTATION_VIEW_FIELDS
    );

  if (dbSession) {
    query = query.session(dbSession);
  }

  return query.lean();
}


// =========================================================
// PREPARE PACKAGE SUBSTATIONS
// =========================================================

function preparePackageSubstations(pkg) {
  if (!pkg) return pkg;

  if (pkg.packageSubstation) {
    pkg.packageSubstation =
      prepareSubstationForView(
        pkg.packageSubstation
      );
  }

  if (pkg.confirmedSubstationId) {
    pkg.confirmedSubstationId =
      prepareSubstationForView(
        pkg.confirmedSubstationId
      );
  }

  if (pkg.deliveredSubstationId) {
    pkg.deliveredSubstationId =
      prepareSubstationForView(
        pkg.deliveredSubstationId
      );
  }

  return pkg;
}


// =========================================================
// PACKAGE FINANCIAL FIELDS
// =========================================================

function addPackageFinancials(pkg) {
  return {
    ...pkg,

    totalPaid: Math.max(
      0,
      Number(pkg.paidAmount || 0)
    ),

    arrearsAmount: Math.max(
      0,
      Number(pkg.totalAmount || 0) -
      Number(pkg.paidAmount || 0)
    )
  };
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  SUBSTATION_VIEW_FIELDS,
  getPaymentStatus,
  getConfirmedPaymentTotal,
  roleOf,
  staffIdOf,
  normalizeStatus,
  normalizePhone,
  normalizeSalesName,
  prepareSubstationForView,
  preparePackageDestination,
  preparePackageSubstations,
  addPackageFinancials,
  getClient
};
