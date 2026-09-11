// ==========================================================
// verrah/services/auth.js
// VERRAH COSMETICS
// AUTHENTICATION SERVICE
// ==========================================================

const User =
    require("../models/user");

const Invitation =
    require("../models/invitation");


// ==========================================================
// HELPERS
// ==========================================================

function cleanString(value) {

    return typeof value === "string"
        ? value.trim()
        : "";
}


function normalizeEmail(email) {

    return cleanString(email).toLowerCase();
}


function normalizePhone(phone) {

    return cleanString(phone);
}


// ==========================================================
// ALLOWED ROLES
// ==========================================================

const ALLOWED_ROLES = [
    "admin",
    "staff",
    "customer"
];


// ==========================================================
// SESSION USER
// ==========================================================

function toSessionUser(user) {

    return {
        _id: user._id.toString(),

        name: user.name,

        phone: user.phone || "",

        email: user.email,

        role: user.role,

        assignedSubstation:
            user.assignedSubstation
                ? user.assignedSubstation.toString()
                : null
    };
}


// ==========================================================
// REGISTER
// ==========================================================

async function register(data = {}) {

    const name =
        cleanString(data.name);

    const phone =
        normalizePhone(data.phone);

    const email =
        normalizeEmail(data.email);

    const password =
        typeof data.password === "string"
            ? data.password
            : "";


    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (!name) {
        throw new Error("Name is required.");
    }

    if (!phone) {
        throw new Error("Phone number is required.");
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


    // ------------------------------------------------------
    // EXISTING EMAIL
    // ------------------------------------------------------

    const existingUser =
        await User.findOne({ email });

    if (existingUser) {

        throw new Error(
            "An account with this email already exists."
        );
    }


    // ------------------------------------------------------
    // INVITATION
    // ------------------------------------------------------

    const invitation =
        await Invitation.findOne({
            email,
            status: "pending"
        }).sort({
            createdAt: -1
        });


    // ------------------------------------------------------
    // ROLE
    // ------------------------------------------------------

    let role = "customer";

    if (
        invitation &&
        ALLOWED_ROLES.includes(invitation.role)
    ) {

        role = invitation.role;
    }


    // ------------------------------------------------------
    // USER
    // ------------------------------------------------------

    const user =
        new User({
            name,
            phone,
            email,
            password,
            role,
            assignedSubstation: null
        });


    await user.save();


    // ------------------------------------------------------
    // CONSUME INVITATION
    // ------------------------------------------------------

    if (invitation) {

        invitation.status = "accepted";

        if (
            Object.prototype.hasOwnProperty.call(
                invitation,
                "acceptedAt"
            )
        ) {
            invitation.acceptedAt =
                new Date();
        }

        await invitation.save();
    }


    return toSessionUser(user);
}


// ==========================================================
// LOGIN
// ==========================================================

async function login(email, password) {

    const normalizedEmail =
        normalizeEmail(email);

    const cleanPassword =
        typeof password === "string"
            ? password
            : "";


    if (!normalizedEmail) {
        throw new Error("Email is required.");
    }

    if (!cleanPassword) {
        throw new Error("Password is required.");
    }


    const user =
        await User.findOne({
            email: normalizedEmail
        });


    if (!user) {

        throw new Error(
            "Invalid email or password."
        );
    }


    const valid =
        user.comparePassword(
            cleanPassword
        );


    if (!valid) {

        throw new Error(
            "Invalid email or password."
        );
    }


    return toSessionUser(user);
}


// ==========================================================
// GET USER BY ID
// ==========================================================

async function getUserById(id) {

    return User.findById(id);
}


// ==========================================================
// CREATE INVITATION
// ==========================================================

async function createInvitation(data = {}) {

    const email =
        normalizeEmail(data.email);

    const role =
        cleanString(data.role);


    if (!email) {
        throw new Error("Email is required.");
    }

    if (!ALLOWED_ROLES.includes(role)) {

        throw new Error(
            "Invalid role."
        );
    }


    const existingInvitation =
        await Invitation.findOne({
            email,
            status: "pending"
        });


    if (existingInvitation) {

        throw new Error(
            "A pending invitation already exists for this email."
        );
    }


    const invitation =
        new Invitation({
            email,
            role,
            status: "pending"
        });


    await invitation.save();

    return invitation;
}


// ==========================================================
// GET INVITATIONS
// ==========================================================

async function getInvitations() {

    return Invitation.find()
        .sort({
            createdAt: -1
        });
}


// ==========================================================
// GET ALL USERS
// ==========================================================

async function getAllUsers() {

    return User.find()
        .populate("assignedSubstation")
        .sort({
            createdAt: -1
        });
}


// ==========================================================
// UPDATE USER ROLE
// ==========================================================

async function updateUserRole(
    userId,
    role
) {

    if (!ALLOWED_ROLES.includes(role)) {

        throw new Error(
            "Invalid role."
        );
    }


    const user =
        await User.findById(userId);


    if (!user) {

        throw new Error(
            "User not found."
        );
    }


    user.role = role;

    await user.save();

    return user;
}


// ==========================================================
// ASSIGN SUBSTATION
// ==========================================================

async function assignSubstation(
    userId,
    substationId
) {

    const user =
        await User.findById(userId);


    if (!user) {

        throw new Error(
            "User not found."
        );
    }


    user.assignedSubstation =
        substationId || null;


    await user.save();

    return user;
}


// ==========================================================
// GET ACTIVE SUBSTATIONS
// ==========================================================

async function getActiveSubstations() {

    // The Substation model is loaded lazily so that
    // authentication can still initialize independently.

    const Substation =
        require("../models/substation");

    return Substation.find({
        status: {
            $ne: "inactive"
        }
    }).sort({
        name: 1
    });
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    register,

    login,

    getUserById,

    createInvitation,

    getInvitations,

    getAllUsers,

    updateUserRole,

    assignSubstation,

    getActiveSubstations,

    toSessionUser

};