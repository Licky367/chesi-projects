// ==========================================================
// corevester/middleware/requireStaff.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Protect routes/pages that are accessible by staff and admins.
//
// ALLOWED:
//     role === "staff"
//     role === "admin"
//
// DENIED:
//     unauthenticated users
//     role === "client"
//     any other role
//
// ==========================================================

module.exports = function requireStaff(req, res, next) {

    // User must be logged in
    if (!req.user) {
        return res.redirect("/auth/login");
    }

    // Staff and admins are allowed
    if (
        req.user.role !== "staff" &&
        req.user.role !== "admin"
    ) {

        return res.status(403).render(
            "error/403",
            {
                title: "Access Denied",
                user: req.user,
                error: "You do not have permission to access this page."
            }
        );
    }

    // Staff/admin allowed
    next();
};