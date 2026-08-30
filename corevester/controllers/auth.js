const authService = require("../services/auth");

function safeReturnTo(value) {
    if (
        typeof value !== "string" ||
        !value.startsWith("/") ||
        value.startsWith("//")
    ) {
        return "/";
    }

    return value;
}

function loginView(res, data = {}) {
    return res.render("auth/login", {
        title: "Log In - COREVESTER",
        error: null,
        email: "",
        returnTo: "/",
        ...data
    });
}

function registerView(res, data = {}) {
    return res.render("auth/register", {
        title: "Create Account - COREVESTER",
        error: null,
        name: "",
        email: "",
        ...data
    });
}

function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

exports.showLogin = (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }

    return loginView(res, {
        returnTo: safeReturnTo(req.query.returnTo)
    });
};

exports.login = async (req, res, next) => {
    try {
        const email =
            String(req.body?.email || "")
                .trim()
                .toLowerCase();

        const password =
            String(req.body?.password || "");

        const returnTo =
            safeReturnTo(req.body?.returnTo);

        if (!email || !password) {
            return loginView(res, {
                error: "Email and password are required.",
                email,
                returnTo
            });
        }

        const user =
            await authService.login({
                email,
                password
            });

        if (!user) {
            return loginView(res, {
                error: "Invalid email or password.",
                email,
                returnTo
            });
        }

        await regenerateSession(req);

        req.session.user =
            authService.toSessionUser(user);

        await saveSession(req);

        return res.redirect(returnTo);

    } catch (err) {
        return next(err);
    }
};

exports.showRegister = (req, res) => {
    if (req.user) {
        return res.redirect("/");
    }

    return registerView(res);
};

exports.register = async (req, res, next) => {
    try {
        const name =
            String(req.body?.name || "").trim();

        const email =
            String(req.body?.email || "")
                .trim()
                .toLowerCase();

        const password =
            String(req.body?.password || "");

        const confirmPassword =
            String(req.body?.confirmPassword || "");

        if (!name || !email || !password) {
            return registerView(res, {
                error:
                    "Name, email and password are required.",
                name,
                email
            });
        }

        if (password.length < 8) {
            return registerView(res, {
                error:
                    "Password must contain at least 8 characters.",
                name,
                email
            });
        }

        if (password !== confirmPassword) {
            return registerView(res, {
                error:
                    "Passwords do not match.",
                name,
                email
            });
        }

        const user =
            await authService.register({
                name,
                email,
                password
            });

        await regenerateSession(req);

        req.session.user =
            authService.toSessionUser(user);

        await saveSession(req);

        return res.redirect("/");

    } catch (err) {
        if (
            err?.code === 11000 ||
            err?.status === 400
        ) {
            return registerView(res, {
                error:
                    err.code === 11000
                        ? "An account with that email already exists."
                        : err.message,
                name:
                    String(
                        req.body?.name || ""
                    ).trim(),
                email:
                    String(
                        req.body?.email || ""
                    ).trim().toLowerCase()
            });
        }

        return next(err);
    }
};

exports.logout = (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }

        res.clearCookie("connect.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure:
                process.env.NODE_ENV === "production"
        });

        return res.redirect("/");
    });
};

// ==========================================================
// ADMIN USER MANAGEMENT
// ==========================================================

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.redirect(
            "/auth/login?returnTo=" +
            encodeURIComponent("/auth/users")
        );
    }

    if (req.user.role !== "admin") {
        return res.status(403).render(
            "error/403",
            {
                title: "Access Denied",
                user: req.user,
                error: "You do not have permission to access user management."
            }
        );
    }

    next();
}

exports.showUsers = [
    requireAdmin,
    async (req, res, next) => {
        try {
            const users =
                await authService.getAllUsers();

            const invitations =
                await authService.getInvitations();

            const substations =
                await authService.getActiveSubstations();

            const allowedTabs = [
                "all",
                "admin",
                "staff",
                "client",
                "invitations"
            ];

            const tab =
                allowedTabs.includes(req.query.tab)
                    ? req.query.tab
                    : "all";

            return res.render(
                "admin/users",
                {
                    title: "User Management - COREVESTER",
                    user: req.user,
                    users,
                    invitations,
                    substations,
                    tab,
                    error: null,
                    success: null
                }
            );

        } catch (err) {
            return next(err);
        }
    }
];

exports.showInvitation = [
    requireAdmin,
    async (req, res, next) => {
        try {
            const invitations = await authService.getInvitations();
            return res.render("admin/invitation", { title: "Invite User - COREVESTER", user: req.user, invitations, error: null, success: null });
        } catch (err) { return next(err); }
    }
];

exports.inviteUser = [
    requireAdmin,
    async (req, res, next) => {
        try {
            await authService.createInvitation({
                email: req.body?.email,
                role: req.body?.role,
                invitedBy: req.user._id
            });

            return res.redirect(
                "/auth/users/invitation?success=" +
                encodeURIComponent(
                    "Invitation role saved successfully."
                )
            );
        } catch (err) {
            return next(err);
        }
    }
];

exports.changeRole = [
    requireAdmin,
    async (req, res, next) => {
        try {
            const updated =
                await authService.updateUserRole({
                    userId: req.params.id,
                    role: req.body?.role,
                    actingAdminId: req.user._id
                });

            if (
                String(updated._id) ===
                String(req.user._id)
            ) {
                req.session.user =
                    authService.toSessionUser(updated);

                await saveSession(req);
            }

            return res.redirect(
                "/auth/users?tab=" +
                encodeURIComponent(
                    updated.role
                ) +
                "&success=" +
                encodeURIComponent(
                    "User role updated successfully."
                )
            );

        } catch (err) {
            return next(err);
        }
    }
];

exports.assignSubstation = [
    requireAdmin,
    async (req, res, next) => {
        try {
            const updated =
                await authService.assignSubstation({
                    userId: req.params.id,
                    substationId:
                        req.body?.assignedSubstation
                });

            if (
                String(updated._id) ===
                String(req.user._id)
            ) {
                req.session.user =
                    authService.toSessionUser(updated);

                await saveSession(req);
            }

            return res.redirect(
                "/auth/users?tab=staff&success=" +
                encodeURIComponent(
                    "Substation assignment updated successfully."
                )
            );

        } catch (err) {
            return next(err);
        }
    }
];
