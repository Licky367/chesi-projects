// ==========================================================
// verrah/services/profile.js
// VERRAH COSMETICS
// PROFILE SERVICE
// ==========================================================

const User =
    require("../models/user");

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

    return cleanString(
        email
    ).toLowerCase();
}


// ==========================================================
// GET PROFILE
// ==========================================================

exports.getProfile =
    async function(userId) {

        if (!userId) {

            const err =
                new Error(
                    "User ID is required."
                );

            err.status = 400;

            throw err;
        }


        const user =
            await User
                .findById(userId)
                .select("-password")
                .populate(
                    "assignedSubstation",
                    "name"
                );


        if (!user) {

            const err =
                new Error(
                    "User not found."
                );

            err.status = 404;

            throw err;
        }


        return user;
    };


// ==========================================================
// UPDATE PROFILE
// ==========================================================

exports.updateProfile =
    async function(data) {

        data =
            data || {};


        const userId =
            data.userId;


        const name =
            cleanString(
                data.name
            );


        const phone =
            cleanString(
                data.phone
            );


        const email =
            normalizeEmail(
                data.email
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


        if (!name) {

            const err =
                new Error(
                    "Name is required."
                );

            err.status = 400;

            throw err;
        }


        if (!phone) {

            const err =
                new Error(
                    "Phone number is required."
                );

            err.status = 400;

            throw err;
        }


        if (!email) {

            const err =
                new Error(
                    "Email is required."
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
        // EMAIL UNIQUENESS
        // --------------------------------------------------

        const existingUser =
            await User.findOne({

                email,

                _id: {
                    $ne: userId
                }

            });


        if (existingUser) {

            const err =
                new Error(
                    "That email address is already being used by another account."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // UPDATE PERSONAL DETAILS
        // --------------------------------------------------

        user.name =
            name;

        user.phone =
            phone;

        user.email =
            email;


        await user.save();


        return User
            .findById(
                user._id
            )
            .select("-password")
            .populate(
                "assignedSubstation",
                "name"
            );
    };


// ==========================================================
// CHANGE PASSWORD
// ==========================================================

exports.changePassword =
    async function(data) {

        data =
            data || {};


        const userId =
            data.userId;


        const currentPassword =
            String(
                data.currentPassword ??
                ""
            );


        const newPassword =
            String(
                data.newPassword ??
                ""
            );


        const confirmPassword =
            String(
                data.confirmPassword ??
                ""
            );


        // --------------------------------------------------
        // REQUIRED FIELDS
        // --------------------------------------------------

        if (
            !userId ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {

            const err =
                new Error(
                    "All password fields are required."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // PASSWORD LENGTH
        // --------------------------------------------------

        if (
            newPassword.length < 6
        ) {

            const err =
                new Error(
                    "New password must contain at least 6 characters."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // PASSWORD MATCH
        // --------------------------------------------------

        if (
            newPassword !==
            confirmPassword
        ) {

            const err =
                new Error(
                    "New passwords do not match."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // FIND USER WITH PASSWORD
        // --------------------------------------------------

        const user =
            await User
                .findById(userId)
                .select("+password");


        if (!user) {

            const err =
                new Error(
                    "User not found."
                );

            err.status = 404;

            throw err;
        }


        // --------------------------------------------------
        // VERIFY CURRENT PASSWORD
        // --------------------------------------------------

        const valid =
            await user.comparePassword(
                currentPassword
            );


        if (!valid) {

            const err =
                new Error(
                    "Current password is incorrect."
                );

            err.status = 400;

            throw err;
        }


        // --------------------------------------------------
        // SAVE NEW PASSWORD
        // --------------------------------------------------

        user.password =
            newPassword;


        await user.save();


        return true;
    };