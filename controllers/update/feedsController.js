// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Display Feed Store page
//     • Receive dairyWorker feed-store reports
//     • Receive admin feed-store restocking requests
//     • Authentication
//     • Authorization
//     • Extract uploaded files
//     • Pass data to feedsService
//
// BUSINESS LOGIC
// ----------------------------------------------------------
//
// Business logic belongs in:
//
//     services/update/feedsService.js
//
// FEED RULES
// ----------------------------------------------------------
//
//     dairyWorker
//         ↓
//     Can submit feed-store condition report
//         ↓
//     Creates a "stock" feed item
//
//     admin
//         ↓
//     Can restock feed store
//         ↓
//     Does NOT create a "stock" feed item
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


const VIEW_ROLES = [

    "admin",

    "dairyWorker"

];


const STOCK_REPORT_ROLE =
    "dairyWorker";


const RESTOCK_ROLE =
    "admin";



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
// CHECK ROLE
// ----------------------------------------------------------

function hasRole(
    user,
    role
) {

    return !!(
        user &&
        user.role === role
    );

}



// ----------------------------------------------------------
// CAN VIEW FEED STORE
// ----------------------------------------------------------

function canViewFeedStore(
    user
) {

    return !!(
        user &&
        VIEW_ROLES.includes(
            user.role
        )
    );

}



// ----------------------------------------------------------
// CAN SUBMIT STOCK REPORT
// ----------------------------------------------------------
//
// IMPORTANT:
//
// Only dairyWorker can create a stock feed item.
//
// Admin is deliberately excluded.
//
// ----------------------------------------------------------

function canSubmitStockReport(
    user
) {

    return hasRole(
        user,
        STOCK_REPORT_ROLE
    );

}



// ----------------------------------------------------------
// CAN RESTOCK
// ----------------------------------------------------------
//
// Only admin can restock.
//
// ----------------------------------------------------------

function canRestockFeedStore(
    user
) {

    return hasRole(
        user,
        RESTOCK_ROLE
    );

}



// ==========================================================
// UPLOADED IMAGE EXTRACTION
// ==========================================================
//
// Supported:
//
//     file.location
//     file.filename
//     file.path
//
// The service remains responsible for normalizing local
// filesystem paths where necessary.
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
// VERIFY FEED STORE
// ==========================================================
//
// Keeps feed-store validation in one place.
//
// ==========================================================

async function getFeedStore(
    dairyId
) {

    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status =
            400;

        throw error;

    }


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy asset not found."
            );

        error.status =
            404;

        throw error;

    }


    if (
        dairy.type !==
        FEED_STORE_TYPE
    ) {

        const error =
            new Error(
                "This dairy asset is not a feed store."
            );

        error.status =
            404;

        throw error;

    }


    return dairy;

}



// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:id
//
// Accessible by:
//
//     admin
//     dairyWorker
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
            !canViewFeedStore(
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



        // --------------------------------------------------
        // FIND FEED STORE
        // --------------------------------------------------

        const dairy =
            await getFeedStore(
                dairyId
            );



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
// CREATE FEED STORE STOCK REPORT
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/update
//
// ONLY:
//
//     dairyWorker
//
// IMPORTANT:
//
// This endpoint creates the feed item that becomes:
//
//     stock.ejs
//
// Admin cannot create this type of feed item.
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
        // DAIRY WORKER ONLY
        // --------------------------------------------------
        //
        // This is intentionally NOT:
        //
        //     canViewFeedStore()
        //
        // because admin can view the page but must not
        // submit a stock report.
        //
        // --------------------------------------------------

        if (
            !canSubmitStockReport(
                user
            )
        ) {

            return res.status(
                403
            ).json({

                success: false,

                message:
                    "Only a dairy worker can submit a feed store report."

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
        // VERIFY FEED STORE
        // --------------------------------------------------

        await getFeedStore(
            dairyId
        );



        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};



        // --------------------------------------------------
        // UPLOADED IMAGES
        // --------------------------------------------------

        const images =
            getUploadedImages(
                req
            );



        // --------------------------------------------------
        // CREATE STOCK REPORT
        // --------------------------------------------------
        //
        // role is explicitly supplied.
        //
        // The service should persist this role onto the
        // resulting feed/update record so feed.ejs can
        // reliably determine that this is a dairyWorker
        // report.
        //
        // --------------------------------------------------

        const update =
            await feedsService.createFeedStoreUpdate({

                dairyId,

                userId,

                role:
                    STOCK_REPORT_ROLE,

                type:
                    "stock",

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
                "Feed store report submitted successfully.",

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
// ONLY:
//
//     admin
//
// IMPORTANT:
//
// Restocking does NOT create a "stock" feed report.
//
// It only changes the feed-store inventory.
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
        // ADMIN ONLY
        // --------------------------------------------------

        if (
            !canRestockFeedStore(
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
        // VERIFY FEED STORE
        // --------------------------------------------------

        await getFeedStore(
            dairyId
        );



        // --------------------------------------------------
        // BODY
        // --------------------------------------------------

        const body =
            req.body || {};



        // --------------------------------------------------
        // RESTOCK
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