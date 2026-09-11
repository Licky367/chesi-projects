// ==========================================================
// verrah/services/auth.js
// VERRAH COSMETICS
// AUTHENTICATION SERVICE
// ==========================================================

const User =
    require("../models/user");

const Invitation =
    require("../models/invitation");

const Substation =
    require("../models/substations");


// ==========================================================
// HELPERS
// ==========================================================

function cleanString(value) {

    return String(
        value ?? ""
    ).trim();
}


function normalizeEmail(email) {

    return cleanString(email)
        .toLowerCase();
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
    "client"
];


// ==========================================================
// SESSION USER
// ==========================================================

exports.toSessionUser =
    function(user) {

        if (!user) {
            return null;
        }


        return {

            _id:
                String(user._id),

            name:
                user.name,

            phone:
                user.phone || "",

            email:
                user.email,

            role:
                user.role,

            assignedSubstation:
                user.assignedSubstation
                    ? String(
                        user.assignedSubstation
                    )
                    : null
        };
    };


// ==========================================================
// REGISTER
// ==========================================================

exports.register =
    async function(data) {

        data =
            data || {};


        const name =
            cleanString(
                data.name
            );


        const phone =
            normalizePhone(
                data.phone
            );


        const email =
            normalizeEmail(
                data.email
            );


        const password =
            String(
                data.password ?? ""
            );


        // --------------------------------------------------
        // REQUIRED FIELDS
        // --------------------------------------------------

        if (!name) {

            throw new Error(
                "Name is required."
            );
        }


        if (!phone) {

            throw new Error(
                "Phone number is required."
            );
        }


        if (!email) {

            throw new Error(
                "Email is required."
            );
        }


        if (!password) {

            throw new Error(
                "Password is required."
            );
        }


        if (password.length < 6) {

            throw new Error(
                "Password must be at least 6 characters."
            );
        }


        // --------------------------------------------------
        // CHECK EXISTING USER
        // --------------------------------------------------

        const existingUser =
            await User.findOne({
                email
            });


        if (existingUser) {

            const err =
                new Error(
                    "An account with this email already exists."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // FIND INVITATION
        // --------------------------------------------------

        const invitation =
            await Invitation.findOne({
                email,
                usedAt: null
            });


        // --------------------------------------------------
        // INVITATION CONTROLS ROLE
        // --------------------------------------------------

        const role =
            invitation?.role ||
            "client";


        // --------------------------------------------------
        // GET ASSIGNED SUBSTATION
        // --------------------------------------------------
        //
        // Only staff invitations may carry
        // an assigned substation.
        //
        // --------------------------------------------------

        let assignedSubstation =
            null;


        if (
            role === "staff" &&
            invitation?.assignedSubstation
        ) {

            const substation =
                await Substation.findById(
                    invitation.assignedSubstation
                );


            if (!substation) {

                const err =
                    new Error(
                        "The substation assigned to this invitation no longer exists."
                    );

                err.status = 400;

                throw err;
            }


            if (
                substation.isActive ===
                false
            ) {

                const err =
                    new Error(
                        "The substation assigned to this invitation is inactive."
                    );

                err.status = 400;

                throw err;
            }


            assignedSubstation =
                substation._id;
        }


        // --------------------------------------------------
        // CREATE USER
        // --------------------------------------------------

        const user =
            new User({

                name,

                phone,

                email,

                password,

                role,

                assignedSubstation
            });


        await user.save();


        // --------------------------------------------------
        // MARK INVITATION AS USED
        // --------------------------------------------------

        if (invitation) {

            invitation.usedAt =
                new Date();

            invitation.usedBy =
                user._id;

            await invitation.save();
        }


        return user;
    };


// ==========================================================
// LOGIN
// ==========================================================

exports.login =
    async function(data) {

        data =
            data || {};


        const email =
            normalizeEmail(
                data.email
            );


        const password =
            String(
                data.password ?? ""
            );


        if (
            !email ||
            !password
        ) {

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

exports.getUserById =
    async function(userId) {

        if (!userId) {
            return null;
        }


        return User
            .findById(userId)
            .populate(
                "assignedSubstation"
            );
    };


// ==========================================================
// ADMIN: CREATE / UPDATE INVITATION
// ==========================================================

exports.createInvitation =
    async function(data) {

        data =
            data || {};


        const email =
            normalizeEmail(
                data.email
            );


        const role =
            cleanString(
                data.role
            ).toLowerCase();


        const invitedBy =
            data.invitedBy;


        const assignedSubstationId =
            cleanString(
                data.assignedSubstation
            ) || null;


        // --------------------------------------------------
        // EMAIL
        // --------------------------------------------------

        if (!email) {

            const err =
                new Error(
                    "Email is required."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        if (
            !ALLOWED_ROLES.includes(
                role
            )
        ) {

            const err =
                new Error(
                    "Invalid role."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // INVITING ADMIN
        // --------------------------------------------------

        if (!invitedBy) {

            const err =
                new Error(
                    "Inviting admin is required."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // CHECK EXISTING USER
        // --------------------------------------------------

        const existingUser =
            await User.findOne({
                email
            });


        if (existingUser) {

            const err =
                new Error(
                    "That email already belongs to a registered user. Change the user's role from the users list instead."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // SUBSTATION RULE
        // --------------------------------------------------
        //
        // Only staff can have an assigned substation.
        //
        // --------------------------------------------------

        let assignedSubstation =
            null;


        if (role === "staff") {

            if (
                !assignedSubstationId
            ) {

                const err =
                    new Error(
                        "A substation must be assigned to a staff invitation."
                    );

                err.status = 400;

                throw err;
            }


            const substation =
                await Substation.findById(
                    assignedSubstationId
                );


            if (!substation) {

                const err =
                    new Error(
                        "Substation not found."
                    );

                err.status = 404;

                throw err;
            }


            if (
                substation.isActive ===
                false
            ) {

                const err =
                    new Error(
                        "The selected substation is inactive."
                    );

                err.status = 400;

                throw err;
            }


            assignedSubstation =
                substation._id;

        } else {

            // Admin and client invitations
            // cannot have a substation.

            assignedSubstation =
                null;
        }


        // --------------------------------------------------
        // CREATE / UPDATE INVITATION
        // --------------------------------------------------

        return Invitation.findOneAndUpdate(

            {
                email
            },

            {

                email,

                role,

                invitedBy,

                assignedSubstation

            },

            {

                new: true,

                upsert: true,

                setDefaultsOnInsert:
                    true

            }
        );
    };


// ==========================================================
// GET INVITATIONS
// ==========================================================

exports.getInvitations =
    async function() {

        return Invitation
            .find({
                usedAt: null
            })
            .populate(
                "invitedBy",
                "name email"
            )
            .populate(
                "assignedSubstation",
                "name"
            )
            .sort({
                createdAt: -1
            });
    };


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers =
    async function() {

        return User
            .find()
            .select("-password")
            .populate(
                "assignedSubstation"
            )
            .sort({
                createdAt: -1
            });
    };


// ==========================================================
// ADMIN: CHANGE ROLE
// ==========================================================

exports.updateUserRole =
    async function(data) {

        const userId =
            data?.userId;


        const role =
            cleanString(
                data?.role
            ).toLowerCase();


        const actingAdminId =
            String(
                data?.actingAdminId ||
                ""
            );


        // --------------------------------------------------
        // VALIDATION
        // --------------------------------------------------

        if (!userId) {

            const err =
                new Error(
                    "User ID is required."
                );

            err.status = 400;

            throw err;
        }


        if (
            !ALLOWED_ROLES.includes(
                role
            )
        ) {

            const err =
                new Error(
                    "Invalid role."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // PREVENT SELF DEMOTION
        // --------------------------------------------------

        if (
            String(userId) ===
            actingAdminId &&
            role !== "admin"
        ) {

            const err =
                new Error(
                    "You cannot remove your own admin role."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // FIND USER
        // --------------------------------------------------

        const user =
            await User.findById(
                userId
            );


        if (!user) {

            const err =
                new Error(
                    "User not found."
                );

            err.status = 404;

            throw err;
        }


        // --------------------------------------------------
        // UPDATE ROLE
        // --------------------------------------------------

        user.role =
            role;


        // --------------------------------------------------
        // SUBSTATION ONLY BELONGS TO STAFF
        // --------------------------------------------------

        if (
            role !== "staff"
        ) {

            user.assignedSubstation =
                null;
        }


        await user.save();


        return user;
    };


// ==========================================================
// ADMIN: ASSIGN SUBSTATION
// ==========================================================

exports.assignSubstation =
    async function(data) {

        const userId =
            data?.userId;


        const substationId =
            cleanString(
                data?.substationId
            ) || null;


        // --------------------------------------------------
        // USER ID
        // --------------------------------------------------

        if (!userId) {

            const err =
                new Error(
                    "User ID is required."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // FIND USER
        // --------------------------------------------------

        const user =
            await User.findById(
                userId
            );


        if (!user) {

            const err =
                new Error(
                    "User not found."
                );

            err.status = 404;

            throw err;
        }


        // --------------------------------------------------
        // STAFF ONLY
        // --------------------------------------------------

        if (
            user.role !== "staff"
        ) {

            const err =
                new Error(
                    "Only staff users can be assigned a substation."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // REMOVE ASSIGNMENT
        // --------------------------------------------------

        if (!substationId) {

            user.assignedSubstation =
                null;

        } else {

            // ------------------------------------------------
            // FIND SUBSTATION
            // ------------------------------------------------

            const substation =
                await Substation.findById(
                    substationId
                );


            if (!substation) {

                const err =
                    new Error(
                        "Substation not found."
                    );

                err.status = 404;

                throw err;
            }


            // ------------------------------------------------
            // ACTIVE CHECK
            // ------------------------------------------------

            if (
                substation.isActive ===
                false
            ) {

                const err =
                    new Error(
                        "The selected substation is inactive."
                    );

                err.status = 400;

                throw err;
            }


            user.assignedSubstation =
                substation._id;
        }


        await user.save();


        return User
            .findById(
                user._id
            )
            .populate(
                "assignedSubstation"
            );
    };


// ==========================================================
// GET ACTIVE SUBSTATIONS
// ==========================================================

exports.getActiveSubstations =
    async function() {

        return Substation
            .find({
                isActive: true
            })
            .sort({
                name: 1
            });
    };