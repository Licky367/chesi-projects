// ==========================================================
// controllers/extrasControler.js
// ASSIGNED ASSETS CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles:
//
//     GET /extras
//     GET /extras/:userId
//
// /extras
//     → displays assets assigned to logged-in user.
//
// /extras/:userId
//     → displays assets assigned to a particular user.
//
// ==========================================================


const mongoose =
    require("mongoose");

const extrasService =
    require("../services/extrasService");


// ==========================================================
// GET CURRENT USER'S ASSIGNED ASSETS
// ==========================================================

async function getExtras(
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // Logged-in user
        // --------------------------------------------------

        const userId =
            req.user &&
            (
                req.user._id ||
                req.user.id
            );


        if (!userId) {

            return res.status(401).render(
                "extras",
                {

                    extras: [],

                    user: null,

                    error:
                        "You must be logged in to view your assigned assets."

                }
            );

        }


        // --------------------------------------------------
        // Retrieve assigned assets
        // --------------------------------------------------

        const result =
            await extrasService
                .getUserAssignedAssets(
                    userId
                );


        if (!result.user) {

            return res.status(404).render(
                "extras",
                {

                    extras: [],

                    user: null,

                    error:
                        "User account could not be found."

                }
            );

        }


        // --------------------------------------------------
        // Render
        // --------------------------------------------------

        return res.render(
            "extras",
            {

                user:
                    result.user,

                extras:
                    result.extras,

                error: null

            }
        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// GET ASSIGNED ASSETS FOR PARTICULAR USER
// ==========================================================
//
// Intended primarily for admin/user-management pages.
//
// Route:
//
//     GET /extras/:userId
//
// ==========================================================

async function getUserExtras(
    req,
    res,
    next
) {

    try {

        const {
            userId
        } = req.params;


        // --------------------------------------------------
        // Validate ID
        // --------------------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(
                userId
            )
        ) {

            return res.status(400).render(
                "extras",
                {

                    extras: [],

                    user: null,

                    error:
                        "Invalid user ID."

                }
            );

        }


        // --------------------------------------------------
        // Retrieve
        // --------------------------------------------------

        const result =
            await extrasService
                .getUserAssignedAssets(
                    userId
                );


        if (!result.user) {

            return res.status(404).render(
                "extras",
                {

                    extras: [],

                    user: null,

                    error:
                        "User account could not be found."

                }
            );

        }


        // --------------------------------------------------
        // Render
        // --------------------------------------------------

        return res.render(
            "extras",
            {

                user:
                    result.user,

                extras:
                    result.extras,

                error: null

            }
        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getExtras,

    getUserExtras

};