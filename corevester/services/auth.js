// ==========================================================
// corevester/services/auth.js
// COREVESTER AUTH SERVICE
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

exports.login =
    async ({
        email,
        password
    }) => {

        const normalizedEmail =
            normalizeEmail(email);

        if (
            !normalizedEmail ||
            !password
        ) {
            return null;
        }

        const user =
            await User.findOne(
                {
                    email:
                        normalizedEmail
                }
            );

        if (!user) {
            return null;
        }

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

exports.register =
    async ({
        name,
        email,
        password
    }) => {

        const normalizedEmail =
            normalizeEmail(email);

        if (!normalizedEmail) {

            const error =
                new Error(
                    "Email is required."
                );

            error.status = 400;

            throw error;
        }

        const existing =
            await User.findOne(
                {
                    email:
                        normalizedEmail
                }
            )
            .select("_id");

        if (existing) {

            const error =
                new Error(
                    "An account with that email already exists."
                );

            error.status = 400;

            throw error;
        }

        const user =
            new User(
                {
                    name:
                        String(
                            name || ""
                        ).trim(),

                    email:
                        normalizedEmail,

                    password
                }
            );

        await user.save();

        return user;
    };

// ==========================================================
// SESSION USER
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
                req.originalUrl ||
                "/"
            );

        return res.redirect(
            `/auth/login?returnTo=${returnTo}`
        );
    };
