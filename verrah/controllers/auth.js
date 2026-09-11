// ==========================================================
// verrah/controllers/auth.js
// VERRAH COSMETICS
// AUTHENTICATION CONTROLLER
// ==========================================================

const authService =
    require("../services/auth");


// ==========================================================
// SAFE RETURN URL
// ==========================================================

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


// ==========================================================
// LOGIN VIEW
// ==========================================================

function loginView(
    res,
    data = {}
) {

    return res.render(
        "auth/login",
        {

            title:
                "Log In - VERRAH COSMETICS",

            error:
                null,

            email:
                "",

            returnTo:
                "/",

            ...data
        }
    );
}


// ==========================================================
// REGISTER VIEW
// ==========================================================

function registerView(
    res,
    data = {}
) {

    return res.render(
        "auth/register",
        {

            title:
                "Create Account - VERRAH COSMETICS",

            error:
                null,

            name:
                "",

            phone:
                "",

            email:
                "",

            ...data
        }
    );
}


// ==========================================================
// REGENERATE SESSION
// ==========================================================

function regenerateSession(req) {

    return new Promise(
        (resolve, reject) => {

            req.session.regenerate(
                err => {

                    if (err) {
                        return reject(err);
                    }

                    resolve();
                }
            );
        }
    );
}


// ==========================================================
// SAVE SESSION
// ==========================================================

function saveSession(req) {

    return new Promise(
        (resolve, reject) => {

            req.session.save(
                err => {

                    if (err) {
                        return reject(err);
                    }

                    resolve();
                }
            );
        }
    );
}


// ==========================================================
// SHOW LOGIN
// ==========================================================

exports.showLogin =
    (req, res) => {

        if (req.user) {

            return res.redirect(
                "/"
            );
        }

        return loginView(
            res,
            {
                returnTo:
                    safeReturnTo(
                        req.query.returnTo
                    )
            }
        );
    };


// ==========================================================
// LOGIN
// ==========================================================

exports.login =
    async (
        req,
        res,
        next
    ) => {

        try {

            const email =
                String(
                    req.body?.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const password =
                String(
                    req.body?.password ||
                    ""
                );


            const returnTo =
                safeReturnTo(
                    req.body?.returnTo
                );


            if (
                !email ||
                !password
            ) {

                return loginView(
                    res,
                    {

                        error:
                            "Email and password are required.",

                        email,

                        returnTo
                    }
                );
            }


            const user =
                await authService.login({
                    email,
                    password
                });


            if (!user) {

                return loginView(
                    res,
                    {

                        error:
                            "Invalid email or password.",

                        email,

                        returnTo
                    }
                );
            }


            await regenerateSession(
                req
            );


            req.session.user =
                authService.toSessionUser(
                    user
                );


            await saveSession(
                req
            );


            return res.redirect(
                returnTo
            );

        } catch (err) {

            return next(err);
        }
    };


// ==========================================================
// SHOW REGISTER
// ==========================================================

exports.showRegister =
    (req, res) => {

        if (req.user) {

            return res.redirect(
                "/"
            );
        }


        return registerView(
            res
        );
    };


// ==========================================================
// REGISTER
// ==========================================================

exports.register =
    async (
        req,
        res,
        next
    ) => {

        try {

            const name =
                String(
                    req.body?.name ||
                    ""
                ).trim();


            const phone =
                String(
                    req.body?.phone ||
                    ""
                ).trim();


            const email =
                String(
                    req.body?.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const password =
                String(
                    req.body?.password ||
                    ""
                );


            const confirmPassword =
                String(
                    req.body?.confirmPassword ||
                    ""
                );


            // ------------------------------------------------
            // REQUIRED FIELDS
            // ------------------------------------------------

            if (
                !name ||
                !phone ||
                !email ||
                !password
            ) {

                return registerView(
                    res,
                    {

                        error:
                            "Name, phone, email and password are required.",

                        name,

                        phone,

                        email
                    }
                );
            }


            // ------------------------------------------------
            // PASSWORD LENGTH
            // ------------------------------------------------

            if (
                password.length < 8
            ) {

                return registerView(
                    res,
                    {

                        error:
                            "Password must contain at least 8 characters.",

                        name,

                        phone,

                        email
                    }
                );
            }


            // ------------------------------------------------
            // PASSWORD MATCH
            // ------------------------------------------------

            if (
                password !==
                confirmPassword
            ) {

                return registerView(
                    res,
                    {

                        error:
                            "Passwords do not match.",

                        name,

                        phone,

                        email
                    }
                );
            }


            // ------------------------------------------------
            // CREATE USER
            // ------------------------------------------------

            const user =
                await authService.register({

                    name,

                    phone,

                    email,

                    password
                });


            // ------------------------------------------------
            // LOGIN AFTER REGISTRATION
            // ------------------------------------------------

            await regenerateSession(
                req
            );


            req.session.user =
                authService.toSessionUser(
                    user
                );


            await saveSession(
                req
            );


            return res.redirect(
                "/"
            );

        } catch (err) {

            if (
                err?.code === 11000 ||
                err?.status === 400
            ) {

                return registerView(
                    res,
                    {

                        error:
                            err.code === 11000
                                ? "An account with that email already exists."
                                : err.message,

                        name:
                            String(
                                req.body?.name ||
                                ""
                            ).trim(),

                        phone:
                            String(
                                req.body?.phone ||
                                ""
                            ).trim(),

                        email:
                            String(
                                req.body?.email ||
                                ""
                            )
                                .trim()
                                .toLowerCase()
                    }
                );
            }


            return next(err);
        }
    };


// ==========================================================
// LOGOUT
// ==========================================================

exports.logout =
    (
        req,
        res,
        next
    ) => {

        req.session.destroy(
            err => {

                if (err) {
                    return next(err);
                }


                res.clearCookie(
                    "connect.sid",
                    {

                        httpOnly:
                            true,

                        sameSite:
                            "lax",

                        secure:
                            process.env.NODE_ENV ===
                            "production"
                    }
                );


                return res.redirect(
                    "/"
                );
            }
        );
    };


// ==========================================================
// ADMIN USER MANAGEMENT
// ==========================================================

function requireAdmin(
    req,
    res,
    next
) {

    if (!req.user) {

        return res.redirect(
            "/auth/login?returnTo=" +
            encodeURIComponent(
                "/auth/users"
            )
        );
    }


    if (
        req.user.role !==
        "admin"
    ) {

        return res.status(403).render(
            "error/403",
            {

                title:
                    "Access Denied",

                user:
                    req.user,

                error:
                    "You do not have permission to access user management."
            }
        );
    }


    next();
}


// ==========================================================
// SHOW USERS
// ==========================================================

exports.showUsers = [

    requireAdmin,

    async (
        req,
        res,
        next
    ) => {

        try {

            const users =
                await authService
                    .getAllUsers();


            const invitations =
                await authService
                    .getInvitations();


            const substations =
                await authService
                    .getActiveSubstations();


            const allowedTabs = [
                "all",
                "admin",
                "staff",
                "client",
                "invitations"
            ];


            const tab =
                allowedTabs.includes(
                    req.query.tab
                )
                    ? req.query.tab
                    : "all";


            return res.render(
                "admin/users",
                {

                    title:
                        "User Management - VERRAH COSMETICS",

                    user:
                        req.user,

                    users,

                    invitations,

                    substations,

                    tab,

                    error:
                        null,

                    success:
                        null
                }
            );

        } catch (err) {

            return next(err);
        }
    }
];


// ==========================================================
// SHOW INVITATION
// ==========================================================

exports.showInvitation = [

    requireAdmin,

    async (
        req,
        res,
        next
    ) => {

        try {

            // ------------------------------------------------
            // GET PENDING INVITATIONS
            // ------------------------------------------------

            const invitations =
                await authService
                    .getInvitations();


            // ------------------------------------------------
            // GET ACTIVE SUBSTATIONS
            // ------------------------------------------------
            //
            // Needed by the Staff invitation form so that
            // the administrator can assign a substation.
            //
            // ------------------------------------------------

            const substations =
                await authService
                    .getActiveSubstations();


            return res.render(
                "admin/invitation",
                {

                    title:
                        "Invite User - VERRAH COSMETICS",

                    user:
                        req.user,

                    invitations,

                    substations,

                    error:
                        null,

                    success:
                        null
                }
            );

        } catch (err) {

            return next(err);
        }
    }
];


// ==========================================================
// INVITE USER
// ==========================================================

exports.inviteUser = [

    requireAdmin,

    async (
        req,
        res,
        next
    ) => {

        try {

            const email =
                String(
                    req.body?.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            const role =
                String(
                    req.body?.role ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            // ------------------------------------------------
            // ONLY STAFF CAN HAVE A SUBSTATION
            // ------------------------------------------------

            const assignedSubstation =
                role === "staff"
                    ? String(
                        req.body?.assignedSubstation ||
                        ""
                    ).trim()
                    : null;


            await authService
                .createInvitation({

                    email,

                    role,

                    assignedSubstation,

                    invitedBy:
                        req.user._id
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


// ==========================================================
// CHANGE ROLE
// ==========================================================

exports.changeRole = [

    requireAdmin,

    async (
        req,
        res,
        next
    ) => {

        try {

            const updated =
                await authService
                    .updateUserRole({

                        userId:
                            req.params.id,

                        role:
                            req.body?.role,

                        actingAdminId:
                            req.user._id
                    });


            if (
                String(updated._id) ===
                String(req.user._id)
            ) {

                req.session.user =
                    authService.toSessionUser(
                        updated
                    );


                await saveSession(
                    req
                );
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


// ==========================================================
// ASSIGN SUBSTATION
// ==========================================================

exports.assignSubstation = [

    requireAdmin,

    async (
        req,
        res,
        next
    ) => {

        try {

            const updated =
                await authService
                    .assignSubstation({

                        userId:
                            req.params.id,

                        substationId:
                            req.body?.assignedSubstation
                    });


            if (
                String(updated._id) ===
                String(req.user._id)
            ) {

                req.session.user =
                    authService.toSessionUser(
                        updated
                    );


                await saveSession(
                    req
                );
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