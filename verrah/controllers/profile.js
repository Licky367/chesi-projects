// ==========================================================
// verrah/controllers/profile.js
// VERRAH COSMETICS
// PROFILE CONTROLLER
// ==========================================================

const profileService =
    require("../services/profile");

const authService =
    require("../services/auth");


// ==========================================================
// REQUIRE LOGIN
// ==========================================================

function requireLogin(
    req,
    res,
    next
) {

    if (!req.user) {

        return res.redirect(
            "/auth/login?returnTo=" +
            encodeURIComponent(
                "/profile"
            )
        );
    }


    next();
}


// ==========================================================
// SHOW PROFILE
// ==========================================================

exports.showProfile = [

    requireLogin,

    async (
        req,
        res,
        next
    ) => {

        try {

            const user =
                await profileService
                    .getProfile(
                        req.user._id
                    );


            return res.render(
                "profile",
                {

                    title:
                        "My Profile - VERRAH COSMETICS",

                    user,

                    success:
                        null,

                    error:
                        null

                }
            );

        } catch (err) {

            return next(err);
        }
    }
];


// ==========================================================
// UPDATE PROFILE
// ==========================================================

exports.updateProfile = [

    requireLogin,

    async (
        req,
        res
    ) => {

        try {

            const updatedUser =
                await profileService
                    .updateProfile({

                        userId:
                            req.user._id,

                        name:
                            req.body?.name,

                        phone:
                            req.body?.phone,

                        email:
                            req.body?.email

                    });


            // ------------------------------------------------
            // KEEP SESSION USER IN SYNC
            // ------------------------------------------------

            req.session.user =
                authService.toSessionUser(
                    updatedUser
                );


            return req.session.save(
                err => {

                    if (err) {

                        console.error(
                            "PROFILE SESSION SAVE ERROR:",
                            err
                        );

                        return res.redirect(
                            "/profile?error=" +
                            encodeURIComponent(
                                "Profile was updated, but the session could not be refreshed."
                            )
                        );
                    }


                    return res.redirect(
                        "/profile?success=" +
                        encodeURIComponent(
                            "Your profile has been updated successfully."
                        )
                    );

                }
            );

        } catch (err) {

            console.error(
                "UPDATE PROFILE ERROR:",
                err
            );


            return res.redirect(
                "/profile?error=" +
                encodeURIComponent(
                    err.message ||
                    "Unable to update your profile."
                )
            );
        }
    }
];


// ==========================================================
// CHANGE PASSWORD
// ==========================================================

exports.changePassword = [

    requireLogin,

    async (
        req,
        res
    ) => {

        try {

            await profileService
                .changePassword({

                    userId:
                        req.user._id,

                    currentPassword:
                        req.body?.currentPassword,

                    newPassword:
                        req.body?.newPassword,

                    confirmPassword:
                        req.body?.confirmPassword

                });


            return res.redirect(
                "/profile?success=" +
                encodeURIComponent(
                    "Your password has been changed successfully."
                )
            );

        } catch (err) {

            console.error(
                "CHANGE PASSWORD ERROR:",
                err
            );


            return res.redirect(
                "/profile?error=" +
                encodeURIComponent(
                    err.message ||
                    "Unable to change your password."
                )
            );
        }
    }
];