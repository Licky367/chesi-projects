// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Display the Feed Store page
//     • Receive feed-store reports
//     • Receive feed-store restocking requests
//     • Perform authentication / authorization checks
//     • Pass business logic to feedsService
//
// Business logic belongs in:
//
//     services/update/feedsService.js
//
// ==========================================================


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

function getUser(req) {

    return (
        req.user ||
        req.session?.user ||
        null
    );

}


// ----------------------------------------------------------
// GET USER ID
// ----------------------------------------------------------

function getUserId(user) {

    return (
        user?._id ||
        user?.id ||
        null
    );

}


// ----------------------------------------------------------
// GET DAIRY ID
// ----------------------------------------------------------
//
// Supports:
//
//     req.params.id
//
// and:
//
//     req.params.dairyId
//
// This keeps the controller compatible with either route
// parameter naming.
//
// ----------------------------------------------------------

function getDairyId(req) {

    return (
        req.params?.id ||
        req.params?.dairyId ||
        null
    );

}


// ----------------------------------------------------------
// CHECK FEED STORE ACCESS
// ----------------------------------------------------------

function canManageFeedStore(user) {

    return !!(
        user &&
        ALLOWED_ROLES.includes(
            user.role
        )
    );

}


// ----------------------------------------------------------
// CHECK ADMIN
// ----------------------------------------------------------

function isAdmin(user) {

    return !!(
        user &&
        user.role === "admin"
    );

}


// ----------------------------------------------------------
// GET UPLOADED IMAGES
// ----------------------------------------------------------
//
// Expected multer configuration:
//
//     upload.array("images", 10)
//
// The service receives only the resulting paths.
//
// ----------------------------------------------------------

function getUploadedImages(req) {

    if (
        !Array.isArray(req.files)
    ) {

        return [];

    }


    return req.files

        .map(
            file => {

                if (!file) {

                    return null;

                }


                return (
                    file.path ||
                    file.location ||
                    file.filename ||
                    null
                );

            }
        )

        .filter(Boolean);

}


// ----------------------------------------------------------
// GET REQUEST BODY
// ----------------------------------------------------------

function getBody(req) {

    return (
        req.body ||
        {}
    );

}


// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:id
//
// Renders:
//
//     views/update/feeds-store.ejs
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
            getUser(req);


        if (!user) {

            return res.status(401).send(
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

            return res.status(403).send(
                "Forbidden"
            );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            getDairyId(req);


        if (!dairyId) {

            return res.status(400).send(
                "Dairy ID is required."
            );

        }


        // --------------------------------------------------
        // GET PAGE DATA
        // --------------------------------------------------
        //
        // The service:
        //
        //     • validates the dairy
        //     • validates feedStore type
        //     • gets feeds
        //     • calculates feedsAmount
        //     • gets recent updates
        //
        // --------------------------------------------------

        const feedStoreData =
            await feedsService.getFeedStorePageDataById
                ? await feedsService.getFeedStorePageDataById(
                    dairyId
                )
                : await getFeedStoreDataFromExistingService(
                    dairyId
                );


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        return res.render(
            "update/feeds-store",
            {

                dairy:
                    feedStoreData.dairy,

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

        next(error);

    }

}


// ==========================================================
// INTERNAL PAGE-DATA COMPATIBILITY HELPER
// ==========================================================
//
// Your current service accepts a Dairy document:
//
//     getFeedStorePageData(dairy)
//
// rather than a dairy ID.
//
// This helper keeps the controller compatible with that
// service without moving service logic into the controller.
//
// ==========================================================

async function getFeedStoreDataFromExistingService(
    dairyId
) {

    const Dairy =
        require("../../models/dairy");


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy asset not found."
            );

        error.status = 404;

        throw error;

    }


    if (
        dairy.type !== FEED_STORE_TYPE
    ) {

        const error =
            new Error(
                "The selected dairy asset is not a feed store."
            );

        error.status = 400;

        throw error;

    }


    const data =
        await feedsService.getFeedStorePageData(
            dairy
        );


    return {

        dairy,

        ...data

    };

}


// ==========================================================
// CREATE FEED STORE UPDATE
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/update
//
// Allowed:
//
//     admin
//     dairyWorker
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
            getUser(req);


        if (!user) {

            return res.status(401).json({

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

            return res.status(403).json({

                success: false,

                message:
                    "You are not authorized to update this feed store."

            });

        }


        // --------------------------------------------------
        // IDs
        // --------------------------------------------------

        const dairyId =
            getDairyId(req);

        const userId =
            getUserId(user);


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!userId) {

            return res.status(400).json({

                success: false,

                message:
                    "User ID is required."

            });

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            getBody(req);


        // --------------------------------------------------
        // IMAGES
        // --------------------------------------------------

        const images =
            getUploadedImages(req);


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

        return res.status(201).json({

            success: true,

            message:
                "Feed store update submitted successfully.",

            update

        });

    }

    catch (error) {

        next(error);

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
            getUser(req);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized"

            });

        }


        // --------------------------------------------------
        // ADMIN ONLY
        // --------------------------------------------------

        if (
            !isAdmin(
                user
            )
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can restock the feed store."

            });

        }


        // --------------------------------------------------
        // IDs
        // --------------------------------------------------

        const dairyId =
            getDairyId(req);

        const userId =
            getUserId(user);


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!userId) {

            return res.status(400).json({

                success: false,

                message:
                    "User ID is required."

            });

        }


        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            getBody(req);


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

        return res.status(200).json({

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

        next(error);

    }

}


// ==========================================================
// EXPORTS
// ==========================================================
//
// IMPORTANT:
//
// Use explicit module.exports.
//
// This guarantees that:
//
//     const {
//         viewFeedStore,
//         updateFeedStore,
//         restockFeedStore
//     } = require("./feedsController");
//
// works correctly.
//
// ==========================================================

module.exports = {

    viewFeedStore,

    updateFeedStore,

    restockFeedStore

};