// ==========================================================
// verrah/middleware/packageSubstationAccess.js
//
// VERRAH COSMETICS
//
// CUSTOMER PICKUP SUBSTATION ACCESS
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../models/substations");

const User =
    require("../models/user");


// ==========================================================
// ID COMPARISON
// ==========================================================

function sameId(a, b) {

    if (!a || !b) {
        return false;
    }

    const left =
        a?._id ||
        a;

    const right =
        b?._id ||
        b;

    return String(left) ===
        String(right);
}


// ==========================================================
// COUNTS
// ==========================================================

function recomputeCounts(packages) {

    return {

        all:
            packages.length,

        pending:
            packages.filter(
                pkg =>
                    pkg.status ===
                    "pending"
            ).length,

        confirmed:
            packages.filter(
                pkg =>
                    pkg.status ===
                    "confirmed"
            ).length,

        delivered:
            packages.filter(
                pkg =>
                    pkg.status ===
                    "delivered"
            ).length
    };
}


// ==========================================================
// STAFF PACKAGE LIST
// ==========================================================
//
// STAFF:
//
//   pending
//       -> only packages whose packageSubstation
//          matches the staff assignedSubstation.
//
//   confirmed
//   delivered
//       -> remain visible.
//
// IMPORTANT:
//
// assignedSubstation is used ONLY to determine which
// pending pickup packages a staff member can see.
//
// It is NEVER used as the confirmation or delivery
// substation.
//
// ==========================================================

exports.filterStaffList =
    (req, res, next) => {

        const role =
            String(
                req.user?.role || ""
            )
                .trim()
                .toLowerCase();


        // ------------------------------------------------------
        // ADMIN
        //
        // Admin package visibility is unchanged.
        // ------------------------------------------------------

        if (role !== "staff") {

            return next();

        }


        const assignedSubstation =
            req.user?.assignedSubstation;


        const originalRender =
            res.render.bind(res);


        res.render =
            function (
                view,
                data,
                callback
            ) {

                if (
                    view !==
                    "packages/staff"
                ) {

                    return originalRender(
                        view,
                        data,
                        callback
                    );

                }


                const originalPackages =
                    Array.isArray(
                        data?.packages
                    )
                        ? data.packages
                        : [];


                if (!assignedSubstation) {

                    return originalRender(
                        view,
                        {
                            ...(data || {}),

                            packages: [],

                            counts: {
                                all: 0,
                                pending: 0,
                                confirmed: 0,
                                delivered: 0
                            },

                            error:
                                "You are not assigned to a substation."
                        },

                        callback
                    );

                }


                const filtered =
                    originalPackages.filter(
                        pkg => {

                            // ----------------------------------
                            // PENDING
                            //
                            // Pending package belongs to the
                            // customer's selected pickup
                            // substation.
                            // ----------------------------------

                            if (
                                pkg.status ===
                                "pending"
                            ) {

                                return sameId(
                                    pkg.packageSubstation,
                                    assignedSubstation
                                );

                            }


                            // ----------------------------------
                            // CONFIRMED / DELIVERED
                            //
                            // Do NOT restrict these by:
                            //
                            //     confirmedByStaffId
                            //     deliveredByStaffId
                            //     assignedSubstation
                            //
                            // Any authorized staff member can
                            // handle a confirmed package.
                            // ----------------------------------

                            return true;

                        }
                    );


                return originalRender(
                    view,
                    {
                        ...(data || {}),

                        packages:
                            filtered,

                        counts:
                            recomputeCounts(
                                filtered
                            )
                    },

                    callback
                );

            };


        next();

    };


// ==========================================================
// STAFF PACKAGE DETAILS
// ==========================================================
//
// Pending package:
//
//     Staff must belong to packageSubstation.
//
// Confirmed package:
//
//     No confirmer ownership restriction.
//
// Delivered package:
//
//     No confirmer/deliverer ownership restriction.
//
// IMPORTANT:
//
// This middleware does NOT decide which substation is used
// for inventory reduction.
//
// Delivery service uses:
//
//     package.packageSubstation
//
// ==========================================================

exports.guardStaffDetails =
    (req, res, next) => {

        const role =
            String(
                req.user?.role || ""
            )
                .trim()
                .toLowerCase();


        // ------------------------------------------------------
        // ADMIN
        //
        // Admin has normal access.
        // ------------------------------------------------------

        if (role !== "staff") {

            return next();

        }


        const assignedSubstation =
            req.user?.assignedSubstation;


        const originalRender =
            res.render.bind(res);


        res.render =
            async function (
                view,
                data,
                callback
            ) {

                if (
                    view !==
                    "packages/staff-details"
                ) {

                    return originalRender(
                        view,
                        data,
                        callback
                    );

                }


                if (!data?.packageDoc) {

                    return originalRender(
                        view,
                        data,
                        callback
                    );

                }


                let packageDoc =
                    data.packageDoc;


                // =================================================
                // PENDING PACKAGE ACCESS
                // =================================================
                //
                // Pending packages are restricted to the staff
                // member's assigned pickup substation.
                //
                // =================================================

                if (
                    packageDoc.status ===
                    "pending" &&
                    !sameId(
                        packageDoc.packageSubstation,
                        assignedSubstation
                    )
                ) {

                    return originalRender(
                        view,
                        {
                            ...data,

                            packageDoc:
                                null,

                            canConfirm:
                                false,

                            confirmationError:
                                "This package belongs to a different pickup substation.",

                            error:
                                "Package not found or not assigned to your substation."
                        },

                        callback
                    );

                }


                // =================================================
                // RESOLVE CUSTOMER
                // =================================================

                let client =
                    packageDoc.client ||
                    null;


                if (
                    packageDoc.clientId
                ) {

                    try {

                        client =
                            await User.findById(
                                packageDoc.clientId
                            )
                                .select(
                                    "_id name email phone"
                                )
                                .lean();

                    } catch (err) {

                        console.error(
                            "Package client lookup error:",
                            err
                        );

                    }

                }


                // =================================================
                // RESOLVE CUSTOMER PICKUP SUBSTATION
                // =================================================
                //
                // ALWAYS:
                //
                //     packageSubstation
                //
                // NEVER:
                //
                //     confirmedSubstationId
                //
                // =================================================

                let packageSubstation =
                    packageDoc.packageSubstation ||
                    null;


                let packageSubstationInfo =
                    null;


                // -------------------------------------------------
                // Already populated
                // -------------------------------------------------

                if (
                    packageSubstation &&
                    typeof packageSubstation ===
                        "object" &&
                    packageSubstation.name
                ) {

                    packageSubstationInfo =
                        packageSubstation;

                }

                // -------------------------------------------------
                // ObjectId
                // -------------------------------------------------

                else if (
                    packageSubstation &&
                    mongoose.Types.ObjectId.isValid(
                        String(
                            packageSubstation
                        )
                    )
                ) {

                    try {

                        packageSubstationInfo =
                            await Substation.findById(
                                packageSubstation
                            )
                                .select(
                                    "_id name location phoneNumber"
                                )
                                .lean();

                    } catch (err) {

                        console.error(
                            "Package substation lookup error:",
                            err
                        );

                    }

                }


                // =================================================
                // PUT RESOLVED DATA BACK INTO PACKAGE
                // =================================================

                packageDoc = {

                    ...packageDoc,

                    packageSubstationInfo:
                        packageSubstationInfo,

                    client:
                        client ||
                        packageDoc.client ||
                        null

                };


                return originalRender(
                    view,
                    {
                        ...data,

                        packageDoc

                    },

                    callback
                );

            };


        next();

    };