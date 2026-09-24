// ==========================================================
// verrah/middleware/requireAccess.js
// VERRAH
// SECURITY KEY ACCESS MIDDLEWARE
// ==========================================================

const SecurityKey = require("../models/securityKey");

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
// 1. User visits the restricted page.
// 2. Security-key modal is rendered.
// 3. User enters the security key.
// 4. Correct key -> continue to restricted page.
// 5. Wrong key -> modal is rendered again with an error.
//
// ==========================================================

async function requireAccess(req, res, next) {

    try {

        // --------------------------------------------------
        // ALREADY VERIFIED
        // --------------------------------------------------

        if (req.session && req.session.securityKeyVerified) {
            return next();
        }

        // --------------------------------------------------
        // CHECK SUBMITTED SECURITY KEY
        // --------------------------------------------------

        const submittedKey =
            typeof req.body?.securityKey === "string"
                ? req.body.securityKey.trim()
                : "";

        if (submittedKey) {

            const securityKey =
                await SecurityKey.findOne({
                    securityKey: submittedKey
                }).lean();

            // ------------------------------------------------
            // CORRECT KEY
            // ------------------------------------------------

            if (securityKey) {

                if (req.session) {
                    req.session.securityKeyVerified = true;
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