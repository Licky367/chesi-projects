// ==========================================================
// corevester/middleware/requireAdmin.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Protect routes/pages that are accessible only to admins.
//
// ALLOWED:
//     role === "admin"
//
// DENIED:
//     unauthenticated users
//     role === "staff"
//     role === "client"
//     any other role
//
// ==========================================================

module.exports = function requireAdmin(req, res, next) {

    // User must be logged in
    if (!req.user) {
        return res.redirect("/auth/login");
    }

    // Only admins are allowed
    if (req.user.role !== "admin") {

        return res.status(403).render(
            "error/403",
            {
                title: "Access Denied",
                user: req.user,
                error: "You do not have permission to access this page."
            }
        );
    }

    // Admin allowed
    next();
};