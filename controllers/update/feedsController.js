// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Display Feed Store page
//     • Receive feed-store reports
//     • Receive feed-store restocking requests
//     • Authentication
//     • Authorization
//     • Extract uploaded files
//     • Pass data to feedsService
//
// Business logic belongs in:
//
//     services/update/feedsService.js
//
// ==========================================================


const Dairy =
    require("../../models/dairy");


const feedsService =
    require("../../services/update/feedsService");


// ==========================================================
// CONSTANTS
// ==========================================================

const FEED_STORE_TYPE =
    "feedStore";


const ALLOWED_ROLES = [

    "admin",

    "dairyWorker"

];


// ==========================================================
// HELPERS
// ==========================================================


// ----------------------------------------------------------
// GET LOGGED-IN USER
// ----------------------------------------------------------

function getUser(
    req
) {

    return (
        req.user ||
        req.session?.user ||
        null
    );

}


// ----------------------------------------------------------
// GET USER ID
// ----------------------------------------------------------

function getUserId(
    user
) {

    return (
        user?._id ||
        user?.id ||
        null
    );

}


// ----------------------------------------------------------
// GET DAIRY ID
// ----------------------------------------------------------

function getDairyId(
    req
) {

    return (
        req.params?.id ||
        req.params?.dairyId ||
        null
    );

}


// ----------------------------------------------------------
// CAN MANAGE FEED STORE
// ----------------------------------------------------------

function canManageFeedStore(
    user
) {

    return !!(
        user &&
        ALLOWED_ROLES.includes(
            user.role
        )
    );

}


// ----------------------------------------------------------
// ADMIN
// ----------------------------------------------------------

function isAdmin(
    user
) {

    return !!(
        user &&
        user.role === "admin"
    );

}


// ==========================================================
// UPLOADED IMAGE EXTRACTION
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// We DO NOT save:
//
//     file.path
//
// directly.
//
// The service will convert the path to:
//
//     /uploads/images/filename.jpg
//
// ==========================================================

function getUploadedImages(
    req
) {

    if (
        !Array.isArray(
            req.files
        )
    ) {

        return [];

    }


    return req.files

        .map(
            file => {

                if (!file) {

                    return null;

                }


                // ------------------------------------------------
                // Cloud storage URL
                // ------------------------------------------------

                if (
                    file.location
                ) {

                    return file.location;

                }


                // ------------------------------------------------
                // Multer filename
                // ------------------------------------------------

                if (
                    file.filename
                ) {

                    return (
                        `/uploads/images/${file.filename}`
                    );

                }


                // ------------------------------------------------
                // Local filesystem path
                //
                // Service will normalize it.
                // ------------------------------------------------

                if (
                    file.path
                ) {

                    return file.path;

                }


                return null;

            }
        )

        .filter(Boolean);

}


// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:id
//
// ==========================================================

async function viewFeedStore(
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // USER
        // --------------------------------------------------

        const user =
            getUser(
                req
            );


        if (!user) {

            return res.status(
                401
            ).send(
                "Unauthorized"
            );

        }


        // --------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------

        if (
            !canManageFeedStore(
                user
            )
        ) {

            return res.status(
                403
            ).send(
                "Forbidden"
            );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            getDairyId(
                req
            );


        if (!dairyId) {

            return res.status(
                400
            ).send(
                "Dairy ID is required."
            );

        }


        // --------------------------------------------------
        // FIND DAIRY
        // --------------------------------------------------

        const dairy =
            await Dairy.findById(
                dairyId
            );


        if (!dairy) {

            return res.status(
                404
            ).send(
                "Dairy asset not found."
            );

        }


        // --------------------------------------------------
        // VERIFY FEED STORE
        // --------------------------------------------------

        if (
            dairy.type !==
            FEED_STORE_TYPE
        ) {

            return res.status(
                404
            ).send(
                "This dairy asset is not a feed store."
            );

        }


        // --------------------------------------------------
        // PAGE DATA
        // --------------------------------------------------

        const feedStoreData =
            await feedsService.getFeedStorePageData(
                dairy
            );


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // Correct directory:
        //
        //     views/update/
        //
        // NOT:
        //
        //     views/updates/
        //
        // --------------------------------------------------

        return res.render(
            "update/feeds-store",
            {

                dairy,

                user,

                feeds:
                    feedStoreData.feeds,

                feedsAmount:
                    feedStoreData.feedsAmount,

                updates:
                    feedStoreData.updates

            }
        );

    }

    catch (error) {

        next(
            error
        );

    }

}


// ==========================================================
// CREATE FEED STORE UPDATE
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/update
//
// ==========================================================

async function updateFeedStore(
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // USER
        // --------------------------------------------------

        const user =
            getUser(
                req
            );


        if (!user) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Unauthorized"

            });

        }


        // --------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------

        if (
            !canManageFeedStore(
                user
            )
        ) {

            return res.status(
                403
            ).json({

                success: false,

                message:
                    "You are not authorized to update this feed store."

            });

        }


        // --------------------------------------------------
        // IDs
        // --------------------------------------------------

        const dairyId =
            getDairyId(
                req
            );


        const userId =
            getUserId(
                user
            );


        if (!dairyId) {

            return res.status(
                400
            ).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!userId) {

            return res.status(
                400
            ).json({

                success: false,

                message:
                    "User ID is required."

            });

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};


        // --------------------------------------------------
        // IMAGES
        // --------------------------------------------------

        const images =
            getUploadedImages(
                req
            );


        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        const update =
            await feedsService.createFeedStoreUpdate({

                dairyId,

                userId,

                role:
                    user.role,

                message:
                    body.message,

                condition:
                    body.condition,

                feedQuality:
                    body.feedQuality,

                percentageRemaining:
                    body.percentageRemaining,

                images

            });


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(
            201
        ).json({

            success: true,

            message:
                "Feed store update submitted successfully.",

            update

        });

    }

    catch (error) {

        next(
            error
        );

    }

}


// ==========================================================
// RESTOCK FEED STORE
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/restock
//
// ADMIN ONLY
//
// ==========================================================

async function restockFeedStore(
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // USER
        // --------------------------------------------------

        const user =
            getUser(
                req
            );


        if (!user) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Unauthorized"

            });

        }


        // --------------------------------------------------
        // ADMIN
        // --------------------------------------------------

        if (
            !isAdmin(
                user
            )
        ) {

            return res.status(
                403
            ).json({

                success: false,

                message:
                    "Only an administrator can restock the feed store."

            });

        }


        // --------------------------------------------------
        // IDS
        // --------------------------------------------------

        const dairyId =
            getDairyId(
                req
            );


        const userId =
            getUserId(
                user
            );


        if (!dairyId) {

            return res.status(
                400
            ).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!userId) {

            return res.status(
                400
            ).json({

                success: false,

                message:
                    "User ID is required."

            });

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};


        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        const result =
            await feedsService.restockFeedStore({

                dairyId,

                userId,

                feedName:
                    body.feedName,

                amount:
                    body.amount,

                cost:
                    body.cost,

                unit:
                    body.unit,

                description:
                    body.description,

                restockMode:
                    body.restockMode,

                existingStock:
                    body.existingStock,

                newStock:
                    body.newStock

            });


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(
            200
        ).json({

            success: true,

            message:
                "Feed stock restocked successfully.",

            feed:
                result.feed,

            feedsAmount:
                result.feedsAmount

        });

    }

    catch (error) {

        next(
            error
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    viewFeedStore,

    updateFeedStore,

    restockFeedStore

};