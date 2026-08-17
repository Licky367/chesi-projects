// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Display the Feed Store page
//     • Receive feed-store condition reports
//     • Receive food-remaining reports
//     • Receive feed-store restocking requests
//     • Handle authentication / authorization
//     • Pass business logic to feedsService
//     • Redirect successful browser form submissions
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
// CHECK FEED STORE MANAGEMENT ACCESS
// ----------------------------------------------------------
//
// Allowed:
//
//     admin
//     dairyWorker
//
// ----------------------------------------------------------

function canManageFeedStore(user) {

    return !!(
        user &&
        (
            user.role === "admin" ||
            user.role === "dairyWorker"
        )
    );

}


// ----------------------------------------------------------
// ADMIN CHECK
// ----------------------------------------------------------

function isAdmin(user) {

    return !!(
        user &&
        user.role === "admin"
    );

}


// ----------------------------------------------------------
// GET UPLOADED IMAGE PATHS
// ----------------------------------------------------------
//
// upload.array("images", 10)
//
// Depending on the upload middleware/storage provider,
// the usable path may be:
//
//     file.path
//     file.location
//     file.url
//     file.filename
//
// The service receives only clean strings.
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
                    file.url ||
                    file.secure_url ||
                    file.filename ||
                    null
                );

            }
        )

        .filter(Boolean);

}


// ----------------------------------------------------------
// SEND ERROR
// ----------------------------------------------------------
//
// This keeps normal browser form submissions from receiving
// confusing JSON responses.
//
// ----------------------------------------------------------

function handleError(
    res,
    error,
    fallbackMessage
) {

    console.error(
        fallbackMessage,
        error
    );


    const status =
        Number.isInteger(error?.status)
            ? error.status
            : 500;


    return res
        .status(status)
        .send(
            error?.message ||
            fallbackMessage
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

exports.viewFeedStore =
async function (
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

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // --------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------

        if (
            !canManageFeedStore(user)
        ) {

            return res
                .status(403)
                .send(
                    "You are not authorized to access this feed store."
                );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // FIND DAIRY
        //
        // The service is responsible for feed-store
        // validation and its page data.
        //
        // findFeedStore is intentionally kept inside the
        // service, so the controller does not duplicate
        // business logic.
        // --------------------------------------------------

        const dairy =
            await require(
                "../../models/dairy"
            ).findById(
                dairyId
            );


        if (!dairy) {

            return res
                .status(404)
                .send(
                    "Dairy asset not found."
                );

        }


        if (
            dairy.type !==
            FEED_STORE_TYPE
        ) {

            return res
                .status(404)
                .send(
                    "This dairy asset is not a feed store."
                );

        }


        // --------------------------------------------------
        // GET PAGE DATA
        // --------------------------------------------------

        const pageData =
            await feedsService.getFeedStorePageData(
                dairy
            );


        // --------------------------------------------------
        // SUCCESS STATE
        // --------------------------------------------------
        //
        // Examples:
        //
        //     ?success=restocked
        //     ?success=updated
        //     ?success=remaining
        //
        // The EJS can use this to display a popup/message.
        //
        // --------------------------------------------------

        const success =
            req.query.success ||
            null;


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        return res.render(
            "update/feeds-store",
            {

                dairy,

                user,

                feeds:
                    pageData.feeds,

                feedsAmount:
                    pageData.feedsAmount,

                updates:
                    pageData.updates,

                success

            }
        );

    }

    catch (error) {

        next(error);

    }

};


// ==========================================================
// UPDATE FEED STORE
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/update
//
// Used for:
//
//     • Facility condition
//     • Feed quality
//     • General report
//     • Percentage remaining
//     • Images
//
// The EJS currently submits:
//
//     feedstoreReportType
//     message
//     images
//
// Additional fields are also accepted:
//
//     condition
//     feedQuality
//     percentageRemaining
//     remainingPercentage
//
// ==========================================================

exports.updateFeedStore =
async function (
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

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // --------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------

        if (
            !canManageFeedStore(user)
        ) {

            return res
                .status(403)
                .send(
                    "You are not authorized to update this feed store."
                );

        }


        // --------------------------------------------------
        // USER ID
        // --------------------------------------------------

        const userId =
            getUserId(user);


        if (!userId) {

            return res
                .status(400)
                .send(
                    "Logged-in user ID is missing."
                );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // REPORT TYPE
        // --------------------------------------------------
        //
        // Current EJS uses:
        //
        //     facilityCondition
        //     feedQuality
        //     facilityAndFeed
        //
        // The service stores the actual report as text.
        //
        // --------------------------------------------------

        const reportType =
            String(
                req.body.feedstoreReportType ||
                ""
            ).trim();


        let condition =
            req.body.condition ||
            "";


        let feedQuality =
            req.body.feedQuality ||
            "";


        if (
            reportType ===
            "facilityCondition"
        ) {

            condition =
                condition ||
                "Facility condition reported.";

        }


        if (
            reportType ===
            "feedQuality"
        ) {

            feedQuality =
                feedQuality ||
                "Feed quality reported.";

        }


        if (
            reportType ===
            "facilityAndFeed"
        ) {

            condition =
                condition ||
                "Facility condition reported.";

            feedQuality =
                feedQuality ||
                "Feed quality reported.";

        }


        // --------------------------------------------------
        // MESSAGE
        // --------------------------------------------------

        const message =
            req.body.message ||
            "";


        // --------------------------------------------------
        // PERCENTAGE
        // --------------------------------------------------
        //
        // Accept both names because the two current EJS
        // forms use different names:
        //
        //     percentageRemaining
        //
        // and:
        //
        //     remainingPercentage
        //
        // --------------------------------------------------

        const percentageRemaining =
            req.body.percentageRemaining !== undefined
                ? req.body.percentageRemaining
                : req.body.remainingPercentage;


        // --------------------------------------------------
        // IMAGES
        // --------------------------------------------------

        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // CREATE UPDATE
        // --------------------------------------------------

        await feedsService.createFeedStoreUpdate({

            dairyId,

            userId,

            role:
                user.role,

            message,

            condition,

            feedQuality,

            percentageRemaining,

            images

        });


        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // Do NOT return res.json() here.
        //
        // This is a normal HTML form submission.
        //
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${dairyId}?success=updated`
        );

    }

    catch (error) {

        return handleError(
            res,
            error,
            "Failed to submit feed store update."
        );

    }

};


// ==========================================================
// REMAINING FOOD REPORT
// ==========================================================
//
// POST:
//
//     /dairy/:id/feedstore/remaining
//
// Used by the separate "Food Remaining" form.
//
// Fields:
//
//     remainingPercentage
//     message
//     images
//
// The same service is used because this is still a
// feed-store update.
//
// ==========================================================

exports.updateFeedStoreRemaining =
async function (
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

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // --------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------

        if (
            !canManageFeedStore(user)
        ) {

            return res
                .status(403)
                .send(
                    "You are not authorized to update this feed store."
                );

        }


        // --------------------------------------------------
        // USER ID
        // --------------------------------------------------

        const userId =
            getUserId(user);


        if (!userId) {

            return res
                .status(400)
                .send(
                    "Logged-in user ID is missing."
                );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // REMAINING PERCENTAGE
        // --------------------------------------------------

        const percentageRemaining =
            req.body.remainingPercentage;


        // --------------------------------------------------
        // MESSAGE
        // --------------------------------------------------

        const message =
            req.body.message ||
            "";


        // --------------------------------------------------
        // IMAGES
        // --------------------------------------------------

        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // CREATE UPDATE
        // --------------------------------------------------

        await feedsService.createFeedStoreUpdate({

            dairyId,

            userId,

            role:
                user.role,

            message,

            condition:
                "",

            feedQuality:
                "",

            percentageRemaining,

            images

        });


        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${dairyId}?success=remaining`
        );

    }

    catch (error) {

        return handleError(
            res,
            error,
            "Failed to submit food remaining report."
        );

    }

};


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
// Current EJS fields:
//
//     restockMode
//     existingStock
//     newStock
//     amount
//     description
//
// Optional fields:
//
//     feedName
//     cost
//     unit
//
// ==========================================================

exports.restockFeedStore =
async function (
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

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // --------------------------------------------------
        // ADMIN ONLY
        // --------------------------------------------------

        if (
            !isAdmin(user)
        ) {

            return res
                .status(403)
                .send(
                    "Only an administrator can restock the feed store."
                );

        }


        // --------------------------------------------------
        // USER ID
        // --------------------------------------------------

        const userId =
            getUserId(user);


        if (!userId) {

            return res
                .status(400)
                .send(
                    "Logged-in user ID is missing."
                );

        }


        // --------------------------------------------------
        // DAIRY ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // --------------------------------------------------
        // RESTOCK MODE
        // --------------------------------------------------

        const restockMode =
            String(
                req.body.restockMode ||
                "existing"
            ).trim();


        // --------------------------------------------------
        // EXISTING STOCK
        // --------------------------------------------------

        const existingStock =
            req.body.existingStock ||
            "";


        // --------------------------------------------------
        // NEW STOCK
        // --------------------------------------------------

        const newStock =
            req.body.newStock ||
            "";


        // --------------------------------------------------
        // AMOUNT
        // --------------------------------------------------

        const amount =
            req.body.amount;


        // --------------------------------------------------
        // OPTIONAL FIELDS
        // --------------------------------------------------

        const feedName =
            req.body.feedName ||
            "";


        const cost =
            req.body.cost;


        const unit =
            req.body.unit ||
            "";


        const description =
            req.body.description ||
            "";


        // --------------------------------------------------
        // RESTOCK
        // --------------------------------------------------

        await feedsService.restockFeedStore({

            dairyId,

            userId,

            feedName,

            amount,

            cost,

            unit,

            description,

            restockMode,

            existingStock,

            newStock

        });


        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // The previous controller returned JSON here.
        //
        // That is why Chrome showed:
        //
        //     {"success":true,...}
        //
        // as a completely new page.
        //
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${dairyId}?success=restocked`
        );

    }

    catch (error) {

        return handleError(
            res,
            error,
            "Failed to restock feed store."
        );

    }

};


// ==========================================================
// EXPORT
// ==========================================================
//
// Named exports are used because the update controller
// index can spread this module:
//
//     ...require("./feedsController")
//
// ==========================================================

module.exports = {

    viewFeedStore,

    updateFeedStore,

    updateFeedStoreRemaining,

    restockFeedStore

};