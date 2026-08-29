// ==========================================================
// corevester/services/auth.js
// COREVESTER AUTH SERVICE
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// Password hashing and password verification are handled by
// the User model.
//
// THIS SERVICE DOES NOT:
//
//     • require bcryptjs
//     • hash passwords
//     • generate password hashes
//     • contain hashing logic
//
// The service is responsible for:
//
//     • normalizing login data
//     • finding the User
//     • delegating password verification to the model
//     • creating the safe session-user object
// ==========================================================

const User =
    require("../models/user");


// ==========================================================
// NORMALIZE EMAIL
// ==========================================================

function normalizeEmail(email) {

    return String(
        email || ""
    )
    .trim()
    .toLowerCase();
}


// ==========================================================
// LOGIN
// ==========================================================
//
// Password verification belongs to the User model.
//
// Replace the model verification call below ONLY if your
// projectUser model uses a different method name.
//
// ==========================================================

exports.login =
    async ({
        email,
        password
    }) => {

        const normalizedEmail =
            normalizeEmail(
                email
            );


        if (!normalizedEmail || !password) {
            return null;
        }


        const user =
            await User.findOne({
                email:
                    normalizedEmail
            });


        if (!user) {
            return null;
        }


        // --------------------------------------------------
        // PASSWORD VERIFICATION
        // --------------------------------------------------
        //
        // The model is responsible for verifying the
        // supplied password against its stored hash.
        //
        // IMPORTANT:
        // Do NOT put bcrypt/bcryptjs here.
        //
        // --------------------------------------------------

        const valid =
            await user.comparePassword(
                password
            );


        if (!valid) {
            return null;
        }


        return user;
    };


// ==========================================================
// REGISTER
// ==========================================================
//
// The User model is responsible for hashing the password
// when the User document is created/saved.
//
// Therefore this service passes the plain password to the
// model and performs NO hashing itself.
// ==========================================================

exports.register =
    async ({
        name,
        email,
        password
    }) => {

        const normalizedEmail =
            normalizeEmail(
                email
            );


        if (!normalizedEmail) {

            const error =
                new Error(
                    "Email is required."
                );

            error.status = 400;

            throw error;
        }


        const existing =
            await User.findOne({
                email:
                    normalizedEmail
            })
            .select("_id");


        if (existing) {

            const error =
                new Error(
                    "An account with that email already exists."
                );

            error.status = 400;

            throw error;
        }


        // --------------------------------------------------
        // IMPORTANT
        // --------------------------------------------------
        //
        // DO NOT HASH password here.
        //
        // The User model handles hashing when the document
        // is saved.
        //
        // --------------------------------------------------

        const user =
            new User({
                name:
                    String(
                        name || ""
                    ).trim(),

                email:
                    normalizedEmail,

                password
            });


        await user.save();


        return user;
    };


// ==========================================================
// SESSION USER
// ==========================================================
//
// Never put the password or password hash into the session.
// ==========================================================

exports.toSessionUser =
    user => ({

        id:
            String(
                user._id
            ),

        _id:
            String(
                user._id
            ),

        name:
            user.name ||
            user.fullName ||
            user.username ||
            "",

        email:
            user.email ||
            "",

        role:
            user.role ||
            null
    });


// ==========================================================
// REQUIRE LOGIN
// ==========================================================

exports.requireLogin =
    (req, res, next) => {

        if (req.user) {
            return next();
        }


        const returnTo =
            encodeURIComponent(
                req.originalUrl || "/"
            );


        return res.redirect(
            `/auth/login?returnTo=${returnTo}`
        );
    };