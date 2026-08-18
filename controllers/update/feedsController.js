// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Render feed-store page
//     • Allow ADMIN to add animal feed
//     • Allow ADMIN to add veterinary medicine
//     • Allow DAIRY WORKER to update remaining stock
//     • Allow ADMIN to update remaining stock
//     • Pass uploaded images to the service
//     • Keep financial information away from workers
//     • Return consistent success/error redirects
//
// ROUTES:
//
//     GET  /dairy/feedstore/:id
//
//     POST /dairy/:id/feedstore/restock
//
//     POST /dairy/:id/feedstore/update
//
// ==========================================================


const feedsService =
    require("../../services/update/feedsService");


// ==========================================================
// HELPERS
// ==========================================================

function getUser(req) {

    return req.user || null;

}


function getUserRole(req) {

    const user =
        getUser(req);

    return (
        user &&
        user.role
    ) || null;

}


function getDairyId(req) {

    return (
        req.params &&
        req.params.id
    ) || null;

}


function redirectWithError(
    res,
    dairyId,
    error
) {

    const message =
        error &&
        error.message

            ? error.message

            : "Unable to process feed-store request.";


    return res.redirect(

        `/dairy/feedstore/${dairyId}` +
        `?error=${encodeURIComponent(message)}`

    );

}


// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET /dairy/feedstore/:id
//
// ==========================================================

async function viewFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // --------------------------------------------------
        // AUTHENTICATION
        // --------------------------------------------------

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // --------------------------------------------------
        // ID
        // --------------------------------------------------

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // LOAD PAGE DATA
        // --------------------------------------------------

        const data =
            await feedsService.getFeedStorePage({

                dairyId,

                user

            });


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        return res.render(

            "update/feeds-store",

            {

                ...data,

                title:
                    "Feed Store"

            }

        );

    } catch (error) {

        console.error(
            "viewFeedStore error:",
            error
        );


        return res
            .status(500)
            .send(
                error.message ||
                "Unable to load the feed store."
            );

    }

}


// ==========================================================
// ADMIN: RESTOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/restock
//
// ADMIN ONLY.
//
// Can:
//
//     • Add new feed
//     • Add new medicine
//     • Increase existing stock
//     • Set financial value
//     • Set instructions
//     • Set expected duration
//     • Upload images
//
// ==========================================================

async function restockFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // --------------------------------------------------
        // AUTHENTICATION
        // --------------------------------------------------

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        if (
            getUserRole(req) !==
            "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add feed or medicine stock."
                );

        }


        // --------------------------------------------------
        // ID
        // --------------------------------------------------

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};


        // --------------------------------------------------
        // FILES
        // --------------------------------------------------

        const files =
            Array.isArray(
                req.files
            )

                ? req.files

                : [];


        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        await feedsService.addStock({

            dairyId,

            user,

            body,

            files

        });


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.redirect(

            `/dairy/feedstore/${dairyId}` +
            "?success=stock-added"

        );

    } catch (error) {

        console.error(
            "restockFeedStore error:",
            error
        );


        return redirectWithError(
            res,
            dairyId,
            error
        );

    }

}


// ==========================================================
// UPDATE REMAINING STOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/update
//
// AVAILABLE TO:
//
//     dairyWorker
//     admin
//
// WORKER MAY CHANGE:
//
//     • Remaining quantity
//     • Unit
//     • Message
//     • Images
//
// WORKER CANNOT CHANGE:
//
//     • Price
//     • feedsAmount
//     • Stock name
//     • Category
//     • Initial quantity
//     • Financial records
//
// ==========================================================

async function updateFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // --------------------------------------------------
        // AUTHENTICATION
        // --------------------------------------------------

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        const role =
            getUserRole(req);


        if (
            role !== "dairyWorker" &&
            role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "You are not authorized to update feed-store stock."
                );

        }


        // --------------------------------------------------
        // ID
        // --------------------------------------------------

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};


        // --------------------------------------------------
        // FILES
        // --------------------------------------------------

        const files =
            Array.isArray(
                req.files
            )

                ? req.files

                : [];


        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        await feedsService.updateRemainingStock({

            dairyId,

            user,

            body,

            files

        });


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.redirect(

            `/dairy/feedstore/${dairyId}` +
            "?success=stock-updated"

        );

    } catch (error) {

        console.error(
            "updateFeedStore error:",
            error
        );


        return redirectWithError(
            res,
            dairyId,
            error
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    viewFeedStore,

    restockFeedStore,

    updateFeedStore

};