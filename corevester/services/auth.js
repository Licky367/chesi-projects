const User = require("../models/user");

const Invitation = require("../models/invitation");

function cleanString(value) {
    return String(value ?? "").trim();
}

function normalizeEmail(email) {
    return cleanString(email).toLowerCase();
}

const ALLOWED_ROLES = ["admin", "staff", "client"];

exports.toSessionUser = function(user) {
    if (!user) {
        return null;
    }

    return {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        assignedSubstation: user.assignedSubstation
            ? String(user.assignedSubstation)
            : null
    };
};

exports.register = async function(data) {
    data = data || {};

    const name = cleanString(data.name);
    const email = normalizeEmail(data.email);
    const password = String(data.password ?? "");

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
        throw new Error("Password must be at least 6 characters.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        const err = new Error(
            "An account with this email already exists."
        );
        err.status = 400;
        throw err;
    }

    // An invitation controls the role at registration time.
    // If no invitation exists, the role is always client.
    const invitation = await Invitation.findOne({ email });

    const role = invitation?.role || "client";

    const user = new User({
        name,
        email,
        password,
        role,
        assignedSubstation: null
    });

    await user.save();

    if (invitation) {
        invitation.usedAt = new Date();
        invitation.usedBy = user._id;
        await invitation.save();
    }

    return user;
};

exports.login = async function(data) {
    data = data || {};

    const email = normalizeEmail(data.email);
    const password = String(data.password ?? "");

    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    const user = await User
        .findOne({ email })
        .select("+password");

    if (!user) {
        throw new Error("Invalid email or password.");
    }

    const isPasswordCorrect =
        await user.comparePassword(password);

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password.");
    }

    return user;
};

exports.getUserById = async function(userId) {
    if (!userId) {
        return null;
    }

    return User.findById(userId)
        .populate("assignedSubstation");
};

// ----------------------------------------------------------
// ADMIN: CREATE / UPDATE INVITATION
// ----------------------------------------------------------

exports.createInvitation = async function(data) {
    const email = normalizeEmail(data?.email);
    const role = cleanString(data?.role).toLowerCase();
    const invitedBy = data?.invitedBy;

    if (!email) {
        const err = new Error("Email is required.");
        err.status = 400;
        throw err;
    }

    if (!ALLOWED_ROLES.includes(role)) {
        const err = new Error("Invalid role.");
        err.status = 400;
        throw err;
    }

    if (!invitedBy) {
        const err = new Error("Inviting admin is required.");
        err.status = 400;
        throw err;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        const err = new Error(
            "That email already belongs to a registered user. Change the user's role from the users list instead."
        );
        err.status = 400;
        throw err;
    }

    return Invitation.findOneAndUpdate(
        { email },
        {
            email,
            role,
            invitedBy
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
};

exports.getInvitations = async function() {
    return Invitation.find({
        usedAt: null
    })
        .populate("invitedBy", "name email")
        .sort({ createdAt: -1 });
};

exports.getAllUsers = async function() {
    return User.find()
        .select("-password")
        .populate("assignedSubstation")
        .sort({ createdAt: -1 });
};

// ----------------------------------------------------------
// ADMIN: CHANGE ROLE
// ----------------------------------------------------------

exports.updateUserRole = async function(data) {
    const userId = data?.userId;
    const role = cleanString(data?.role).toLowerCase();
    const actingAdminId = String(data?.actingAdminId || "");

    if (!userId) {
        const err = new Error("User ID is required.");
        err.status = 400;
        throw err;
    }

    if (!ALLOWED_ROLES.includes(role)) {
        const err = new Error("Invalid role.");
        err.status = 400;
        throw err;
    }

    // Prevent an admin from accidentally removing their own admin access.
    if (String(userId) === actingAdminId && role !== "admin") {
        const err = new Error(
            "You cannot remove your own admin role."
        );
        err.status = 400;
        throw err;
    }

    const user = await User.findById(userId);

    if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        throw err;
    }

    user.role = role;

    // A substation is meaningful only for staff.
    if (role !== "staff") {
        user.assignedSubstation = null;
    }

    await user.save();

    return user;
};

// ----------------------------------------------------------
// ADMIN: ASSIGN SUBSTATION
// ----------------------------------------------------------

exports.assignSubstation = async function(data) {
    const userId = data?.userId;
    const substationId =
        cleanString(data?.substationId) || null;

    if (!userId) {
        const err = new Error("User ID is required.");
        err.status = 400;
        throw err;
    }

    const user = await User.findById(userId);

    if (!user) {
        const err = new Error("User not found.");
        err.status = 404;
        throw err;
    }

    if (user.role !== "staff") {
        const err = new Error(
            "Only staff users can be assigned a substation."
        );
        err.status = 400;
        throw err;
    }

    if (!substationId) {
        user.assignedSubstation = null;
    } else {
        const Substation = require("../models/substations");
        const substation =
            await Substation.findById(substationId);

        if (!substation) {
            const err = new Error("Substation not found.");
            err.status = 404;
            throw err;
        }

        if (substation.isActive === false) {
            const err = new Error(
                "The selected substation is inactive."
            );
            err.status = 400;
            throw err;
        }

        user.assignedSubstation = substation._id;
    }

    await user.save();

    return User.findById(user._id)
        .populate("assignedSubstation");
};

exports.getActiveSubstations = async function() {
    const Substation = require("../models/substations");

    return Substation.find({
        isActive: true
    }).sort({
        name: 1
    });
};
