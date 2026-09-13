// ==========================================================
// verrah/middleware/packageSubstationAccess.js
//
// Staff package visibility is tied to the customer's selected
// packageSubstation.
//
// Pending packages:
//   staff sees only packages for assignedSubstation.
//
// Confirmed/delivered packages:
//   existing staff ownership rules remain intact.
// ==========================================================

const Substation = require("../models/substations");
const User = require("../models/user");

function sameId(a, b) {
    if (!a || !b) return false;

    return String(
        a?._id ||
        a
    ) === String(
        b?._id ||
        b
    );
}

function recomputeCounts(packages) {
    return {
        all: packages.length,

        pending:
            packages.filter(
                pkg => pkg.status === "pending"
            ).length,

        confirmed:
            packages.filter(
                pkg => pkg.status === "confirmed"
            ).length,

        delivered:
            packages.filter(
                pkg => pkg.status === "delivered"
            ).length
    };
}


// ==========================================================
// STAFF LIST
// ==========================================================

exports.filterStaffList = (req, res, next) => {
    const role =
        String(
            req.user?.role || ""
        ).trim().toLowerCase();

    if (role !== "staff") {
        return next();
    }

    const assignedSubstation =
        req.user?.assignedSubstation;

    if (!assignedSubstation) {
        const originalRender = res.render.bind(res);

        res.render = function(view, data, callback) {
            if (view === "packages/staff") {
                const safeData = {
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
                };

                return originalRender(
                    view,
                    safeData,
                    callback
                );
            }

            return originalRender(
                view,
                data,
                callback
            );
        };

        return next();
    }

    const originalRender =
        res.render.bind(res);

    res.render = function(view, data, callback) {
        if (
            view === "packages/staff" &&
            data
        ) {
            const originalPackages =
                Array.isArray(data.packages)
                    ? data.packages
                    : [];

            const filtered =
                originalPackages.filter(pkg => {

                    // Pending packages are visible ONLY
                    // at their selected pickup substation.
                    if (
                        pkg.status === "pending"
                    ) {
                        return sameId(
                            pkg.packageSubstation,
                            assignedSubstation
                        );
                    }

                    // Existing service logic already limits
                    // confirmed/delivered packages to the
                    // staff member who owns them.
                    return true;
                });

            data = {
                ...data,
                packages: filtered,
                counts:
                    recomputeCounts(filtered)
            };
        }

        return originalRender(
            view,
            data,
            callback
        );
    };

    next();
};


// ==========================================================
// STAFF DETAIL
// ==========================================================

exports.guardStaffDetails = (req, res, next) => {
    const role =
        String(
            req.user?.role || ""
        ).trim().toLowerCase();

    if (role !== "staff") {
        return next();
    }

    const assignedSubstation =
        req.user?.assignedSubstation;

    const originalRender =
        res.render.bind(res);

    res.render = async function(view, data, callback) {
        if (
            view === "packages/staff-details" &&
            data?.packageDoc
        ) {
            const pkg =
                data.packageDoc;

            if (
                pkg.status === "pending" &&
                !sameId(
                    pkg.packageSubstation,
                    assignedSubstation
                )
            ) {
                data = {
                    ...data,
                    packageDoc: null,
                    canConfirm: false,
                    confirmationError:
                        "This package belongs to a different pickup substation.",
                    error:
                        "Package not found or not assigned to your substation."
                };
            }

            if (data.packageDoc) {
                try {
                    const lookups = [
                        data.packageDoc.packageSubstation
                            ? Substation.findById(
                                data.packageDoc.packageSubstation
                            )
                                .select("_id name location phoneNumber")
                                .lean()
                            : Promise.resolve(null),

                        data.packageDoc.clientId
                            ? User.findById(
                                data.packageDoc.clientId
                            )
                                .select("_id name email phone")
                                .lean()
                            : Promise.resolve(null)
                    ];

                    const [
                        substation,
                        client
                    ] = await Promise.all(lookups);

                    data.packageDoc = {
                        ...data.packageDoc,

                        packageSubstationInfo:
                            substation || null,

                        client:
                            client || data.packageDoc.client || null
                    };
                } catch (err) {
                    console.error(
                        "Package staff overview lookup error:",
                        err
                    );
                }
            }
        }

        return originalRender(
            view,
            data,
            callback
        );
    };

    next();
};
