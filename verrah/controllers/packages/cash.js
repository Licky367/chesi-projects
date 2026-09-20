// =========================================================
// verrah/controllers/packages/cash.js
// VERRAH COSMETICS
// CHANGE PACKAGE TO CASH
// =========================================================

const mongoose = require("mongoose");

const Package = require("../../models/package");


// =========================================================
// POST /packages/staff/cash
//
// Changes a package from:
//
//     isCash = false
//
// to:
//
//     isCash = true
//
// Only packages with outstanding arrears can be changed.
// =========================================================

async function markCash(req, res) {
  try {

    const packageId =
      String(req.body?.packageId || "").trim();


    // -------------------------------------------------------
    // VALIDATE PACKAGE ID
    // -------------------------------------------------------

    if (!packageId) {
      return res.status(400).send(
        "Package ID is required."
      );
    }


    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return res.status(400).send(
        "Invalid package ID."
      );
    }


    // -------------------------------------------------------
    // FIND PACKAGE
    // -------------------------------------------------------

    const packageDoc =
      await Package.findById(packageId);


    if (!packageDoc) {
      return res.status(404).send(
        "Package not found."
      );
    }


    // -------------------------------------------------------
    // CALCULATE ARREARS
    // -------------------------------------------------------

    const totalAmount =
      Math.max(
        0,
        Number(packageDoc.totalAmount || 0)
      );


    const totalPaid =
      Math.max(
        0,
        Number(packageDoc.paidAmount || 0)
      );


    const arrears =
      Math.max(
        0,
        totalAmount - totalPaid
      );


    // -------------------------------------------------------
    // PACKAGE MUST HAVE ARREARS
    // -------------------------------------------------------

    if (arrears <= 0) {
      return res.status(400).send(
        "This package has no outstanding arrears."
      );
    }


    // -------------------------------------------------------
    // ALREADY CASH
    // -------------------------------------------------------

    if (packageDoc.isCash === true) {
      return res.redirect(
        `/packages/staff/${packageDoc._id}`
      );
    }


    // -------------------------------------------------------
    // CHANGE TO CASH
    //
    // Do not modify payment amounts or payment status here.
    // The amount-paid form will handle the actual payment.
    // -------------------------------------------------------

    packageDoc.isCash = true;

    await packageDoc.save();


    // -------------------------------------------------------
    // RETURN TO PACKAGE DETAILS
    // -------------------------------------------------------

    return res.redirect(
      `/packages/staff/${packageDoc._id}`
    );

  } catch (err) {

    console.error(
      "Error changing package to cash:",
      err
    );

    return res.status(500).send(
      "Unable to change package to cash."
    );
  }
}


module.exports = {
  markCash
};