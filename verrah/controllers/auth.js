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

    if (typeof value !== "string") {
        return "/";
    }

    const trimmed =
        value.trim();

    if (!trimmed) {
        return "/";
    }

    // Only allow local paths.
    if (
        !trimmed.startsWith("/") ||
        trimmed.startsWith("//")
    ) {
        return "/";
    }

    return trimmed;
}


// ==========================================================
// LOGIN VIEW
// ==========================================================

function loginView(res, data = {}) {

    return res.render(
        "auth/login",
        {
            title: "Log In - COREVESTER",

            error: null,

            email: "",

            returnTo: "/",

            ...data
        }
    );
}


// ==========================================================
// REGISTER VIEW
// ==========================================================

function registerView(res, data = {}) {

    return res.render(
        "auth/register",
        {
            title: "Create Account - COREVESTER",

            error: null,

            name: "",

            phone: "",

            email: "",

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
                (error) => {

                    if (error) {
                        return reject(error);
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
                (error) => {

                    if (error) {
                        return reject(error);
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
    function (req, res) {

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
    async function (req, res) {

        const email =
            String(
                req.body?.email || ""
            ).trim();

        const password =
            String(
                req.body?.password || ""
            );

        const returnTo =
            safeReturnTo(
                req.body?.returnTo
            );


        try {

            if (!email) {

                return loginView(
                    res,
                    {
                        error:
                            "Email is required.",

                        email,

                        returnTo
                    }
                );
            }


            if (!password) {

                return loginView(
                    res,
                    {
                        error:
                            "Password is required.",

                        email,

                        returnTo
                    }
                );
            }


            const user =
                await authService.login(
                    email,
                    password
                );


            await regenerateSession(req);


            req.session.user =
                user;


            await saveSession(req);


            return res.redirect(
                returnTo || "/"
            );

        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            return loginView(
                res,
                {
                    error:
                        error.message ||
                        "Unable to log in.",

                    email,

                    returnTo
                }
            );
        }
    };


// ==========================================================
// SHOW REGISTER
// ==========================================================

exports.showRegister =
    function (req, res) {

        return registerView(
            res
        );
    };


// ==========================================================
// REGISTER
// ==========================================================

exports.register =
    async function (req, res) {

        const name =
            String(
                req.body?.name || ""
            ).trim();

        const phone =
            String(
                req.body?.phone || ""
            ).trim();

        const email =
            String(
                req.body?.email || ""
            ).trim();

        const password =
            String(
                req.body?.password || ""
            );

        const confirmPassword =
            String(
                req.body?.confirmPassword || ""
            );


        try {

            // ------------------------------------------------
            // REQUIRED FIELDS
            // ------------------------------------------------

            if (!name) {

                return registerView(
                    res,
                    {
                        error:
                            "Name is required.",

                        name,

                        phone,

                        email
                    }
                );
            }


            if (!phone) {

                return registerView(
                    res,
                    {
                        error:
                            "Phone number is required.",

                        name,

                        phone,

                        email
                    }
                );
            }


            if (!email) {

                return registerView(
                    res,
                    {
                        error:
                            "Email is required.",

                        name,

                        phone,

                        email
                    }
                );
            }


            if (!password) {

                return registerView(
                    res,
                    {
                        error:
                            "Password is required.",

                        name,

                        phone,

                        email
                    }
                );
            }


            // ------------------------------------------------
            // PASSWORD LENGTH
            // ------------------------------------------------

            if (password.length < 8) {

                return registerView(
                    res,
                    {
                        error:
                            "Password must be at least 8 characters.",

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
            // CREATE ACCOUNT
            // ------------------------------------------------

            const user =
                await authService.register({
                    name,

                    phone,

                    email,

                    password
                });


            // ------------------------------------------------
            // LOGIN NEW USER
            // ------------------------------------------------

            await regenerateSession(req);


            req.session.user =
                user;


            await saveSession(req);


            return res.redirect("/");

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            return registerView(
                res,
                {
                    error:
                        error.message ||
                        "Unable to create account.",

                    name,

                    phone,

                    email
                }
            );
        }
    };


// ==========================================================
// LOGOUT
// ==========================================================

exports.logout =
    function (req, res) {

        req.session.destroy(
            (error) => {

                if (error) {

                    console.error(
                        "Logout error:",
                        error
                    );
                }

                res.clearCookie(
                    "connect.sid"
                );

                return res.redirect(
                    "/"
                );
            }
        );
    };


// ==========================================================
// REQUIRE ADMIN
// ==========================================================

function requireAdmin(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/auth/login"
        );
    }


    if (
        req.session.user.role !==
        "admin"
    ) {

        return res.status(403).send(
            "Forbidden"
        );
    }


    next();
}


// ==========================================================
// SHOW USERS
// ==========================================================

exports.showUsers = [
    requireAdmin,

    async function (req, res) {

        try {

            const users =
                await authService.getAllUsers();

            const invitations =
                await authService.getInvitations();

            const substations =
                await authService
                    .getActiveSubstations();


            return res.render(
                "admin/users",
                {
                    title:
                        "User Management - COREVESTER",

                    users,

                    invitations,

                    substations,

                    error: null,

                    success: null
                }
            );

        } catch (error) {

            console.error(
                "Show users error:",
                error
            );


            return res.status(500).render(
                "admin/users",
                {
                    title:
                        "User Management - COREVESTER",

                    users: [],

                    invitations: [],

                    substations: [],

                    error:
                        error.message ||
                        "Unable to load users.",

                    success: null
                }
            );
        }
    }
];


// ==========================================================
// SHOW INVITATION
// ==========================================================

exports.showInvitation = [
    requireAdmin,

    function (req, res) {

        return res.render(
            "admin/invite",
            {
                title:
                    "Invite User - COREVESTER",

                error: null,

                success: null,

                email: "",

                role: "staff"
            }
        );
    }
];


// ==========================================================
// INVITE USER
// ==========================================================

exports.inviteUser = [
    requireAdmin,

    async function (req, res) {

        const email =
            String(
                req.body?.email || ""
            ).trim();

        const role =
            String(
                req.body?.role || ""
            ).trim();


        try {

            await authService.createInvitation({
                email,

                role
            });


            return res.render(
                "admin/invite",
                {
                    title:
                        "Invite User - COREVESTER",

                    error: null,

                    success:
                        "Invitation created successfully.",

                    email: "",

                    role: "staff"
                }
            );

        } catch (error) {

            console.error(
                "Invite user error:",
                error
            );


            return res.status(400).render(
                "admin/invite",
                {
                    title:
                        "Invite User - COREVESTER",

                    error:
                        error.message ||
                        "Unable to create invitation.",

                    success: null,

                    email,

                    role
                }
            );
        }
    }
];


// ==========================================================
// CHANGE ROLE
// ==========================================================

exports.changeRole = [
    requireAdmin,

    async function (req, res) {

        const userId =
            req.params.id;

        const role =
            String(
                req.body?.role || ""
            ).trim();


        try {

            await authService.updateUserRole(
                userId,
                role
            );


            return res.redirect(
                "/auth/users"
            );

        } catch (error) {

            console.error(
                "Change role error:",
                error
            );


            return res.status(400).send(
                error.message ||
                "Unable to change user role."
            );
        }
    }
];


// ==========================================================
// ASSIGN SUBSTATION
// ==========================================================

exports.assignSubstation = [
    requireAdmin,

    async function (req, res) {

        const userId =
            req.params.id;

        const substationId =
            String(
                req.body?.substationId || ""
            ).trim();


        try {

            await authService.assignSubstation(
                userId,
                substationId || null
            );


            return res.redirect(
                "/auth/users"
            );

        } catch (error) {

            console.error(
                "Assign substation error:",
                error
            );


            return res.status(400).send(
                error.message ||
                "Unable to assign substation."
            );
        }
    }
];