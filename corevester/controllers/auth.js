// ==========================================================
// corevester/controllers/auth.js
// COREVESTER AUTH CONTROLLER
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
// SESSION SAVE
// ==========================================================

function saveSession(req) {

    return new Promise(
        (resolve, reject) => {

            req.session.save(err => {

                if (err) {
                    return reject(err);
                }

                resolve();
            });
        }
    );
}

// ==========================================================
// SESSION REGENERATE
// ==========================================================

function regenerateSession(req) {

    return new Promise(
        (resolve, reject) => {

            req.session.regenerate(err => {

                if (err) {
                    return reject(err);
                }

                resolve();
            });
        }
    );
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
            email: "",
            ...data
        }
    );
}

// ==========================================================
// SHOW LOGIN
// ==========================================================

exports.showLogin =
    (req, res) => {

        if (req.user) {
            return res.redirect("/");
        }

        return loginView(
            res,
            {
                returnTo:
                    safeReturnTo(
                        req.query?.returnTo
                    )
            }
        );
    };

// ==========================================================
// LOGIN
// ==========================================================

exports.login =
    async (req, res, next) => {

        try {

            const email =
                String(
                    req.body?.email || ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    req.body?.password || ""
                );

            const returnTo =
                safeReturnTo(
                    req.body?.returnTo
                );

            if (!email || !password) {

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
                await authService.login(
                    {
                        email,
                        password
                    }
                );

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

            // --------------------------------------------------
            // Prevent session fixation.
            // --------------------------------------------------

            await regenerateSession(req);

            // --------------------------------------------------
            // Keep the login session persistent.
            //
            // The server's session-store configuration must also
            // have a matching persistent TTL. The controller
            // deliberately does not store credentials.
            // --------------------------------------------------

            req.session.user =
                authService.toSessionUser(user);

            // Mark this as a persistent login.
            req.session.authenticated = true;

            await saveSession(req);

            return res.redirect(returnTo);

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
            return res.redirect("/");
        }

        return registerView(res);
    };

// ==========================================================
// REGISTER
// ==========================================================

exports.register =
    async (req, res, next) => {

        try {

            const name =
                String(
                    req.body?.name || ""
                ).trim();

            const email =
                String(
                    req.body?.email || ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    req.body?.password || ""
                );

            const confirmPassword =
                String(
                    req.body?.confirmPassword || ""
                );

            if (
                !name ||
                !email ||
                !password
            ) {

                return registerView(
                    res,
                    {
                        error:
                            "Name, email and password are required.",
                        name,
                        email
                    }
                );
            }

            if (password.length < 8) {

                return registerView(
                    res,
                    {
                        error:
                            "Password must contain at least 8 characters.",
                        name,
                        email
                    }
                );
            }

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
                        email
                    }
                );
            }

            const user =
                await authService.register(
                    {
                        name,
                        email,
                        password
                    }
                );

            await regenerateSession(req);

            req.session.user =
                authService.toSessionUser(user);

            req.session.authenticated = true;

            await saveSession(req);

            return res.redirect("/");

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
                                req.body?.name || ""
                            ).trim(),
                        email:
                            String(
                                req.body?.email || ""
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
    (req, res, next) => {

        if (!req.session) {
            return res.redirect("/");
        }

        req.session.destroy(err => {

            if (err) {
                return next(err);
            }

            res.clearCookie(
                "connect.sid",
                {
                    httpOnly: true,
                    sameSite: "lax",
                    secure:
                        process.env.NODE_ENV === "production"
                }
            );

            return res.redirect("/");
        });
    };
