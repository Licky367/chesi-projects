// ==========================================================
// verrah/middleware/requireAccess.js
// VERRAH
// SECURITY KEY ACCESS MIDDLEWARE
// ==========================================================

const mongoose = require("mongoose");

const SecurityKey = require("../models/securityKey");
const Substation = require("../models/substations");

// ==========================================================
// REQUIRE ACCESS
// ==========================================================
//
// Usage:
//
// router.get(
//     "/restricted",
//     requireAccess,
//     controller
// );
//
// Behaviour:
//
// ADMIN:
//
//     Uses SecurityKey.securityKey
//
// STAFF:
//
//     Uses Substation.substationKey from the substation
//     assigned to req.user.assignedSubstation
//
// OTHER ROLES:
//
//     Access denied.
//
// ==========================================================

async function requireAccess(req, res, next) {

    try {

        // --------------------------------------------------
        // REQUIRE AUTHENTICATED USER
        // --------------------------------------------------

        if (!req.user) {

            return res.status(403).send(
                "Access denied."
            );
        }

        // --------------------------------------------------
        // ALREADY VERIFIED
        // --------------------------------------------------

        if (
            req.session &&
            req.session.securityKeyVerified
        ) {

            return next();
        }

        // --------------------------------------------------
        // GET USER ROLE
        // --------------------------------------------------

        const role = req.user.role;

        // --------------------------------------------------
        // DETERMINE EXPECTED SECURITY KEY
        // --------------------------------------------------

        let expectedKey = null;

        // ==================================================
        // ADMIN
        // ==================================================
        //
        // Admin uses the global SecurityKey.
        //
        // ==================================================

        if (role === "admin") {

            const securityKey =
                await SecurityKey.findOne()
                    .select("securityKey")
                    .lean();

            if (securityKey) {

                expectedKey =
                    securityKey.securityKey;
            }
        }

        // ==================================================
        // STAFF
        // ==================================================
        //
        // Staff uses the key belonging to their assigned
        // substation.
        //
        // ==================================================

        else if (role === "staff") {

            const assignedSubstation =
                req.user.assignedSubstation;

            // ----------------------------------------------
            // STAFF MUST HAVE AN ASSIGNED SUBSTATION
            // ----------------------------------------------

            if (!assignedSubstation) {

                return res.status(403).send(
                    "Access denied. No substation assigned."
                );
            }

            // ----------------------------------------------
            // VALIDATE OBJECT ID
            // ----------------------------------------------

            if (
                !mongoose.Types.ObjectId.isValid(
                    assignedSubstation
                )
            ) {

                return res.status(403).send(
                    "Access denied. Invalid assigned substation."
                );
            }

            // ----------------------------------------------
            // GET SUBSTATION KEY
            // ----------------------------------------------

            const substation =
                await Substation.findById(
                    assignedSubstation
                )
                    .select("substationKey")
                    .lean();

            if (substation) {

                expectedKey =
                    substation.substationKey;
            }
        }

        // ==================================================
        // OTHER ROLES
        // ==================================================

        else {

            return res.status(403).send(
                "Access denied."
            );
        }

        // --------------------------------------------------
        // SECURITY KEY NOT FOUND
        // --------------------------------------------------

        if (!expectedKey) {

            return res.status(403).send(
                "Access denied. Security key is not configured."
            );
        }

        // --------------------------------------------------
        // CHECK SUBMITTED SECURITY KEY
        // --------------------------------------------------

        const submittedKey =
            typeof req.body?.securityKey === "string"
                ? req.body.securityKey.trim()
                : "";

        if (submittedKey) {

            // ------------------------------------------------
            // CORRECT KEY
            // ------------------------------------------------

            if (submittedKey === expectedKey) {

                if (req.session) {

                    req.session.securityKeyVerified =
                        true;
                }

                return next();
            }

            // ------------------------------------------------
            // WRONG KEY
            // ------------------------------------------------

            return res.render(
                "securityKey",
                {
                    error: "Wrong security key. Try again."
                }
            );
        }

        // --------------------------------------------------
        // FIRST ACCESS
        // --------------------------------------------------

        return res.render(
            "securityKey",
            {
                error: null
            }
        );

    } catch (error) {

        console.error(
            "Security key verification error:",
            error
        );

        return res.status(500).send(
            "Unable to verify security key."
        );
    }
}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = requireAccess;