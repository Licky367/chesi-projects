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

        // Regenerate the session after successful authentication
        // to prevent session fixation.
        await regenerateSession(req);

        req.session.user =
            authService.toSessionUser(user);

        // Explicitly persist the authenticated session.
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
            String(req.body?.name || "")
                .trim();

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
