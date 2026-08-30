const User = require("../models/user");

// ==========================================================
// CLEAN STRING
// ==========================================================

function cleanString(value) {
    return String(value ?? "").trim();
}

// ==========================================================
// NORMALIZE EMAIL
// ==========================================================

function normalizeEmail(email) {
    return cleanString(email).toLowerCase();
}

// ==========================================================
// SAFE SESSION USER
// ==========================================================

exports.toSessionUser = function(user) {
    if (!user) {
        return null;
    }

    return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role
    };
};

// ==========================================================
// REGISTER USER
// ==========================================================
//
// IMPORTANT:
// Password hashing is handled ONLY by models/user.js.
//
// The plain password is passed to User and user.save()
// triggers the model's pre("save") scrypt hashing hook.
//
// ==========================================================

exports.register = async function(data) {
    data = data || {};

    const name =
        cleanString(data.name);

    const email =
        normalizeEmail(data.email);

    const password =
        String(data.password ?? "");

    if (!name) {
        throw new Error("Name is required.");
    }

    if (!email) {
        throw new Error("Email is required.");
    }

    if (!password) {
        throw new Error("Password is required.");
    }

    if (password.length < 6) {
        throw new Error(
            "Password must be at least 6 characters."
        );
    }

    const existingUser =
        await User.findOne({
            email
        });

    if (existingUser) {
        throw new Error(
            "An account with this email already exists."
        );
    }

    const user =
        new User({
            name,
            email,
            password,
            role: "client"
        });

    await user.save();

    return user;
};

// ==========================================================
// LOGIN USER
// ==========================================================
//
// IMPORTANT:
// User.password uses select:false.
//
// Therefore the password MUST be explicitly selected before
// comparePassword() is called.
//
// Password verification remains compatible with the existing
// user model's crypto.scrypt salt:hash format.
//
// ==========================================================

exports.login = async function(data) {
    data = data || {};

    const email =
        normalizeEmail(data.email);

    const password =
        String(data.password ?? "");

    if (!email || !password) {
        throw new Error(
            "Email and password are required."
        );
    }

    const user =
        await User
            .findOne({
                email
            })
            .select("+password");

    if (!user) {
        throw new Error(
            "Invalid email or password."
        );
    }

    const isPasswordCorrect =
        await user.comparePassword(
            password
        );

    if (!isPasswordCorrect) {
        throw new Error(
            "Invalid email or password."
        );
    }

    return user;
};

// ==========================================================
// GET USER BY ID
// ==========================================================

exports.getUserById = async function(userId) {
    if (!userId) {
        return null;
    }

    return User.findById(userId);
};
