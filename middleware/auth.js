// ==========================================================
// middleware/auth.js
// ==========================================================
//
// AUTHENTICATION / AUTHORIZATION MIDDLEWARE
//
// This middleware works with the session created in:
//
//     server.js
//
// The server stores the authenticated user at:
//
//     req.session.user
//
// server.js also exposes it as:
//
//     req.user
//
// Available roles:
//
//     admin
//     dairyWorker
//     poultryWorker
//
// ==========================================================


// ==========================================================
// REQUIRE AUTHENTICATION
//
// User must be logged in.
//
// Usage:
//
//     router.get(
//         "/",
//         auth,
//         controller
//     );
//
// ==========================================================

function auth(
    req,
    res,
    next
) {

    // ------------------------------------------------------
    // GET CURRENT USER
    // ------------------------------------------------------

    const user =
        req.session?.user ||
        req.user ||
        null;


    // ------------------------------------------------------
    // NOT AUTHENTICATED
    // ------------------------------------------------------

    if (!user) {

        // --------------------------------------------------
        // API REQUEST
        // --------------------------------------------------

        if (
            req.path.startsWith("/api/") ||
            req.accepts("json") &&
            !req.accepts("html")
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Authentication required."

            });

        }


        // --------------------------------------------------
        // SAVE ORIGINAL URL
        //
        // This allows the login system to redirect the user
        // back to the page they originally requested if the
        // login controller supports return URLs.
        // --------------------------------------------------

        if (
            req.session
        ) {

            req.session.returnTo =
                req.originalUrl;

        }


        // --------------------------------------------------
        // REDIRECT TO LOGIN
        // --------------------------------------------------

        return res.redirect(
            "/login"
        );

    }


    // ------------------------------------------------------
    // MAKE USER AVAILABLE
    // ------------------------------------------------------

    req.user =
        user;


    res.locals.user =
        user;


    next();

}


// ==========================================================
// REQUIRE ROLE
//
// Usage:
//
//     router.get(
//         "/",
//         auth,
//         requireRole("admin"),
//         controller
//     );
//
// Multiple roles:
//
//     requireRole(
//         "admin",
//         "dairyWorker"
//     );
//
// ==========================================================

function requireRole(
    ...allowedRoles
) {

    return function(
        req,
        res,
        next
    ) {

        // --------------------------------------------------
        // USER MUST FIRST BE AUTHENTICATED
        // --------------------------------------------------

        const user =
            req.user ||
            req.session?.user ||
            null;


        if (!user) {

            if (
                req.path.startsWith("/api/")
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            return res.redirect(
                "/login"
            );

        }


        // --------------------------------------------------
        // USER ROLE
        // --------------------------------------------------

        const role =
            user.role;


        // --------------------------------------------------
        // CHECK ROLE
        // --------------------------------------------------

        if (
            allowedRoles.includes(
                role
            )
        ) {

            return next();

        }


        // --------------------------------------------------
        // FORBIDDEN
        // --------------------------------------------------

        if (
            req.path.startsWith("/api/") ||
            (
                req.accepts("json") &&
                !req.accepts("html")
            )
        ) {

            return res.status(403).json({

                success:
                    false,

                message:
                    "You do not have permission to access this resource."

            });

        }


        return res.status(403).render(

            "403",

            {

                title:
                    "403 - Access Denied",

                user:
                    user,

                error:
                    "You do not have permission to access this resource."

            }

        );

    };

}


// ==========================================================
// REQUIRE ADMIN
//
// Shortcut for:
//
//     requireRole("admin")
//
// Usage:
//
//     router.post(
//         "/something",
//         auth,
//         requireAdmin,
//         controller
//     );
//
// ==========================================================

function requireAdmin(
    req,
    res,
    next
) {

    return requireRole(
        "admin"
    )(
        req,
        res,
        next
    );

}


// ==========================================================
// REQUIRE DAIRY ACCESS
//
// Admins and dairy workers can access dairy functionality.
//
// ==========================================================

function requireDairyAccess(
    req,
    res,
    next
) {

    return requireRole(

        "admin",

        "dairyWorker"

    )(
        req,
        res,
        next
    );

}


// ==========================================================
// REQUIRE POULTRY ACCESS
//
// Admins and poultry workers can access poultry
// functionality.
//
// ==========================================================

function requirePoultryAccess(
    req,
    res,
    next
) {

    return requireRole(

        "admin",

        "poultryWorker"

    )(
        req,
        res,
        next
    );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = auth;


// ==========================================================
// ATTACH HELPERS
// ==========================================================
//
// This allows both:
//
//     const auth = require("../middleware/auth");
//
// and:
//
//     auth.requireRole(...)
//
//     auth.requireAdmin
//
//     auth.requireDairyAccess
//
//     auth.requirePoultryAccess
//
// ==========================================================

module.exports.requireRole =
    requireRole;


module.exports.requireAdmin =
    requireAdmin;


module.exports.requireDairyAccess =
    requireDairyAccess;


module.exports.requirePoultryAccess =
    requirePoultryAccess;