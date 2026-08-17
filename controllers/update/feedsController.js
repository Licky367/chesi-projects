// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Display the Food Stock page
//     • Receive feed-store condition updates
//     • Receive feed-store restocking requests
//     • Validate basic request requirements
//     • Pass business logic to services
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
// CHECK AUTHORIZATION
// ----------------------------------------------------------
//
// Feed-store operations are available to:
//
//     admin
//     dairyWorker
//
// Restocking is restricted to:
//
//     admin
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


function isAdmin(user) {

    return !!(
        user &&
        user.role === "admin"
    );

}


// ----------------------------------------------------------
// NORMALIZE UPLOADED IMAGES
// ----------------------------------------------------------
//
// upload.array("images", 10) gives us:
//
//     req.files
//
// The service receives a clean array of image paths.
//
// ----------------------------------------------------------

function getUploadedImages(req) {

    if (
        !Array.isArray(req.files)
    ) {

        return [];

    }

    return req.files
        .map(file => {

            if (!file) {
                return null;
            }

            return (
                file.path ||
                file.filename ||
                file.location ||
                null
            );

        })
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
// Renders:
//
//     views/updates/feeds-store.ejs
//
// ==========================================================

exports.viewFeedStore =
async function(req, res, next) {

    try {

        const user =
            getUser(req);


        // --------------------------------------------------
        // Authentication
        // --------------------------------------------------

        if (!user) {

            return res.status(401).send(
                "Unauthorized"
            );

        }


        // --------------------------------------------------
        // Authorization
        // --------------------------------------------------

        if (
            !canManageFeedStore(user)
        ) {

            return res.status(403).send(
                "Forbidden"
            );

        }


        // --------------------------------------------------
        // ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res.status(400).send(
                "Dairy ID is required."
            );

        }


        // --------------------------------------------------
        // Make sure the requested Dairy exists.
        //
        // The service will handle the actual feed-store
        // data retrieval.
        // --------------------------------------------------

        const dairy =
            await Dairy.findById(
                dairyId
            );


        if (!dairy) {

            return res.status(404).send(
                "Dairy asset not found."
            );

        }


        // --------------------------------------------------
        // Feed Store validation
        //
        // A Food Stock page belongs specifically to a
        // structure whose type is feedStore.
        // --------------------------------------------------

        if (
            dairy.type !== "feedStore"
        ) {

            return res.status(404).send(
                "This dairy asset is not a feed store."
            );

        }


        // --------------------------------------------------
        // Retrieve feed-store page data.
        //
        // Business/data preparation stays inside the
        // service.
        // --------------------------------------------------

        const feedStoreData =
            await feedsService.getFeedStorePageData(
                dairy
            );


        // --------------------------------------------------
        // Render page
        // --------------------------------------------------

        return res.render(
            "update/feeds-store",
            {

                dairy,

                user,

                ...feedStoreData

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
// Used by:
//
//     admin
//     dairyWorker
//
// Can contain:
//
//     • message
//     • facility condition
//     • feed quality
//     • percentage remaining
//     • images
//
// The resulting update is stored through the service.
//
// ==========================================================

exports.updateFeedStore =
async function(req, res, next) {

    try {

        const user =
            getUser(req);


        // --------------------------------------------------
        // Authentication
        // --------------------------------------------------

        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }


        // --------------------------------------------------
        // Authorization
        // --------------------------------------------------

        if (
            !canManageFeedStore(user)
        ) {

            return res.status(403).json({

                success: false,

                message: "You are not authorized to update this feed store."

            });

        }


        // --------------------------------------------------
        // Dairy ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message: "Dairy ID is required."

            });

        }


        // --------------------------------------------------
        // Uploaded images
        // --------------------------------------------------

        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // Pass the complete submission to the service.
        //
        // Do NOT calculate feedsAmount here.
        //
        // Do NOT manipulate Update.js here.
        //
        // The service owns that business logic.
        // --------------------------------------------------

        const result =
            await feedsService.createFeedStoreUpdate({

                dairyId,

                userId:
                    user._id ||
                    user.id,

                role:
                    user.role,

                message:
                    req.body.message,

                condition:
                    req.body.condition,

                feedQuality:
                    req.body.feedQuality,

                percentageRemaining:
                    req.body.percentageRemaining,

                images

            });


        // --------------------------------------------------
        // Response
        // --------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Feed store update submitted successfully.",

            update:
                result

        });

    }

    catch (error) {

        next(error);

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
// Existing stock:
//
//     fodder
//     silage
//     hay
//     etc.
//
// Or a new stock category can be created.
//
// The service is responsible for:
//
//     • finding the existing feed category
//     • creating a new category when necessary
//     • updating its amount
//     • recording financial information
//     • recalculating feedsAmount
//
// IMPORTANT:
//
// feedsAmount must always represent the SUM of all
// individual feed amounts.
//
// ==========================================================

exports.restockFeedStore =
async function(req, res, next) {

    try {

        const user =
            getUser(req);


        // --------------------------------------------------
        // Authentication
        // --------------------------------------------------

        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Unauthorized"

            });

        }


        // --------------------------------------------------
        // ADMIN ONLY
        // --------------------------------------------------

        if (
            !isAdmin(user)
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can restock the feed store."

            });

        }


        // --------------------------------------------------
        // Dairy ID
        // --------------------------------------------------

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        // --------------------------------------------------
        // Extract restocking data.
        //
        // The service will perform strict validation.
        // --------------------------------------------------

        const result =
            await feedsService.restockFeedStore({

                dairyId,

                userId:
                    user._id ||
                    user.id,

                feedName:
                    req.body.feedName,

                amount:
                    req.body.amount,

                cost:
                    req.body.cost,

                unit:
                    req.body.unit,

                description:
                    req.body.description

            });


        // --------------------------------------------------
        // Response
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

};


// ==========================================================
// EXPORT
// ==========================================================
//
// The file uses named exports because:
//
//     controllers/update/index.js
//
// spreads this module:
//
//     ...require("./feedsController")
//
// ==========================================================