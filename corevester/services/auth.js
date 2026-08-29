const bcrypt = require("bcryptjs");
const User = require("../models/projectUser");

function passwordPath() {
    if (User.schema.path("passwordHash")) return "passwordHash";
    if (User.schema.path("password")) return "password";

    const err = new Error(
        "User model must contain passwordHash or password for CoreVester authentication."
    );
    err.status = 500;
    throw err;
}

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

exports.login = async ({ email, password }) => {
    const user = await User.findOne({
        email: normalizeEmail(email)
    }).select("+password +passwordHash");

    if (!user) return null;

    const field = passwordPath();
    const hash = user[field];

    if (!hash) return null;

    const valid = await bcrypt.compare(password, hash);

    return valid ? user : null;
};

exports.register = async ({ name, email, password }) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        const err = new Error("Email is required.");
        err.status = 400;
        throw err;
    }

    const existing = await User.findOne({
        email: normalizedEmail
    }).select("_id");

    if (existing) {
        const err = new Error(
            "An account with that email already exists."
        );
        err.status = 400;
        throw err;
    }

    const field = passwordPath();

    const data = {
        email: normalizedEmail,
        [field]: await bcrypt.hash(password, 12)
    };

    if (User.schema.path("name")) {
        data.name = String(name || "").trim();
    }

    const user = new User(data);
    await user.save();

    return user;
};

exports.toSessionUser = user => ({
    id: String(user._id),
    _id: String(user._id),
    name: user.name || user.fullName || user.username || "",
    email: user.email || "",
    role: user.role || null
});

exports.requireLogin = (req, res, next) => {
    if (req.user) return next();

    const returnTo = encodeURIComponent(req.originalUrl || "/");

    return res.redirect(`/auth/login?returnTo=${returnTo}`);
};
