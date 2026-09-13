// ==========================================================
// verrah/middleware/packageSubstationAccess.js
//
// VERRAH COSMETICS
//
// CUSTOMER PICKUP SUBSTATION ACCESS
// ==========================================================

const mongoose = require("mongoose");

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

    return String(left) === String(right);
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
                    pkg.status === "pending"
            ).length,

        confirmed:
            packages.filter(
                pkg =>
                    pkg.status === "confirmed"
            ).length,

        delivered:
            packages.filter(
                pkg =>
                    pkg.status === "delivered"
            ).length
    };
}


// ==========================================================
// STAFF PACKAGE LIST
// ==========================================================

exports.filterStaffList =
    (req, res, next) => {

        const role =
            String(
                req.user?.role || ""
            )
                .trim()
                .toLowerCase();


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

                            /*
                             * Pending packages belong
                             * to the customer's selected
                             * pickup station.
                             */

                            if (
                                pkg.status ===
                                "pending"
                            ) {

                                return sameId(
                                    pkg.packageSubstation,
                                    assignedSubstation
                                );
                            }


                            /*
                             * Once confirmed, the
                             * existing staff ownership
                             * rules apply.
                             */

                            return true;
                        }
                    );


                return originalRender(
                    view,
                    {
                        ...(data || {}),

                        packages: filtered,

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

exports.guardStaffDetails =
    (req, res, next) => {

        const role =
            String(
                req.user?.role || ""
            )
                .trim()
                .toLowerCase();


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
                // ACCESS CHECK
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
                //
                // This is packageSubstation.
                // NOT confirmedSubstationId.
                // =================================================

                let packageSubstation =
                    packageDoc.packageSubstation ||
                    null;


                let packageSubstationInfo =
                    null;


                /*
                 * If it is already populated,
                 * use it directly.
                 */

                if (
                    packageSubstation &&
                    typeof packageSubstation ===
                        "object" &&
                    packageSubstation.name
                ) {

                    packageSubstationInfo =
                        packageSubstation;

                } else if (
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