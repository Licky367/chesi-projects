// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles:
//
//     GET    /dairy/:id
//     GET    /dairy/:id/assets
//     GET    /dairy/:id/general
//     GET    /dairy/:id/addOns
//
//     POST   /dairy/:id/toggle-milking
//     GET    /dairy/:id/switch
//
//     POST   /dairy/:id/liability
//     POST   /dairy/:id/revenue
//
//     POST   /dairy/:id/boolean/:field
//     GET    /dairy/boolean/fields
//
//     POST   /dairy/:id/comment
//     POST   /dairy/:id/post
//
//     PUT    /dairy/:id/image
//     PUT    /dairy/:id/update
//
//     POST   /dairy/:id/medical-mark
//     POST   /dairy/:id/medical-unmark
//
//     POST   /dairy/:id/maintenance/mark
//     POST   /dairy/:id/maintenance/clear
//
//     GET    /dairy/:contentItemId/:dwellNumber
//     POST   /dairy/:contentItemId/:dwellNumber
//
//     POST   /post/:id/like
//     POST   /post/:id/comment
//
//     DELETE /post/:id
//     DELETE /comment/:id
//
// ==========================================================


const updateService =
    require("../../services/update");


// ==========================================================
// SMALL HELPERS
// ==========================================================

function getSessionUser(req) {

    return (
        req.user ||
        req.session?.user ||
        null
    );

}


function getUserId(req) {

    const user =
        getSessionUser(req);

    return user
        ? user._id
        : null;

}


function isPositiveCode(dairy) {

    if (
        !dairy ||
        dairy.code === null ||
        dairy.code === undefined
    ) {

        return false;

    }

    return Number(
        dairy.code
    ) > 0;

}


function isUnmarkedMedical(dairy) {

    return Boolean(
        dairy &&
        dairy.medicalAttention &&
        dairy.medicalAttention.isMarked === false
    );

}


function sendServiceError(
    res,
    err,
    fallbackMessage
) {

    console.error(
        fallbackMessage,
        err
    );

    const status =
        Number(
            err && err.statusCode
        );

    if (
        Number.isInteger(status) &&
        status >= 400 &&
        status <= 599
    ) {

        return res
            .status(status)
            .send(
                err.message ||
                fallbackMessage
            );

    }

    return res
        .status(500)
        .send(
            fallbackMessage
        );

}


// ==========================================================
// VIEW DAIRY PROFILE
// ==========================================================
//
// GET:
//
//     /dairy/:id
//
// IMPORTANT
// ----------------------------------------------------------
//
// EXISTING LOGIC PRESERVED.
//
// This remains the existing Dairy profile renderer.
// Nothing about its rendering logic is changed.
//
// ==========================================================

exports.viewPage = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const sessionUser =
            getSessionUser(req);

        const userId =
            getUserId(req);


        const data =
            await updateService.getDairyPage(
                id,
                userId
            );


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        let itemLinks = [];


        if (
            typeof updateService.getItemLinks ===
            "function"
        ) {

            const resolvedItemLinks =
                await updateService.getItemLinks(
                    id
                );


            itemLinks =
                Array.isArray(
                    resolvedItemLinks
                )
                    ? resolvedItemLinks
                    : [];

        }


        let booleanAnimals = [];

        let booleanFields = [];


        if (
            typeof updateService.getBooleanData ===
            "function"
        ) {

            const booleanData =
                await updateService.getBooleanData();


            booleanAnimals =
                Array.isArray(
                    booleanData?.animals
                )
                    ? booleanData.animals
                    : [];


            booleanFields =
                Array.isArray(
                    booleanData?.fields
                )
                    ? booleanData.fields
                    : [];

        }


        const isDairyFarm =
            data.dairy.code !== null &&
            data.dairy.code !== undefined &&
            Number(
                data.dairy.code
            ) < 0;


        const farmAssets =
            Array.isArray(
                data.assetDairies
            )
                ? data.assetDairies
                : [];


        const medicalDairies =
            farmAssets.filter(
                function(animal) {

                    return (
                        isPositiveCode(animal) &&
                        isUnmarkedMedical(animal)
                    );

                }
            );


        const medicalAnimals =
            farmAssets.filter(
                function(animal) {

                    return (
                        isPositiveCode(animal) &&
                        isUnmarkedMedical(animal)
                    );

                }
            );


        const feed =
            Array.isArray(
                data.feed
            )
                ? data.feed
                : [];


        const weeklyFeed =
            data.weeklyFeeds ||
            null;


        const commentCount =
            Number(
                data.commentCount || 0
            );


        const assignedFarms =
            Array.isArray(
                data.assignedFarms
            )
                ? data.assignedFarms
                : [];


        const animalFeeds =
            Array.isArray(
                data.animalFeeds
            )
                ? data.animalFeeds
                : [];


        const view =
            isDairyFarm
                ? "update"
                : "dairySet";


        return res.render(
            view,
            {

                title:
                    "Dairy Profile",

                dairy:
                    data.dairy,

                feed:
                    feed,

                weeklyFeed:
                    weeklyFeed,

                commentCount:
                    commentCount,

                assetDairies:
                    farmAssets,

                assignedFarms:
                    assignedFarms,

                animalFeeds:
                    animalFeeds,

                itemLinks:
                    itemLinks,

                booleanAnimals:
                    booleanAnimals,

                booleanFields:
                    booleanFields,

                medicalDairies:
                    medicalDairies,

                medicalAnimals:
                    medicalAnimals,

                user:
                    sessionUser

            }
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load dairy profile."
        );

    }

};


// ==========================================================
// VIEW ASSETS
// ==========================================================
//
// GET:
//
//     /dairy/:id/assets
//
// RENDERS:
//
//     views/asset-page.ejs
//
// IMPORTANT
// ----------------------------------------------------------
//
// This is a NEW route.
//
// It does NOT replace or modify /dairy/:id.
//
// assetDairies is taken directly from the existing
// getDairyPage() service response.
//
// ==========================================================

exports.viewAssets = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const sessionUser =
            getSessionUser(req);


        const data =
            await updateService.getDairyPage(
                id,
                getUserId(req)
            );


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        const assetDairies =
            Array.isArray(
                data.assetDairies
            )
                ? data.assetDairies
                : [];


        return res.render(
            "asset-page",
            {

                title:
                    "Dairy Assets",

                dairy:
                    data.dairy,

                assetDairies:
                    assetDairies,

                user:
                    sessionUser

            }
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load dairy assets."
        );

    }

};


// ==========================================================
// VIEW GENERAL
// ==========================================================
//
// GET:
//
//     /dairy/:id/general
//
// ==========================================================

exports.viewGeneral = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const sessionUser =
            getSessionUser(req);


        const data =
            await updateService.getDairyPage(
                id,
                getUserId(req)
            );


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        const isDairyFarm =
            data.dairy.code !== null &&
            data.dairy.code !== undefined &&
            Number(
                data.dairy.code
            ) < 0;


        if (!isDairyFarm) {

            return res
                .status(400)
                .send(
                    "General feed is only available to a Dairy Farm."
                );

        }


        return res.render(
            "updateGeneral",
            {

                title:
                    "General Updates",

                dairy:
                    data.dairy,

                feed:
                    Array.isArray(
                        data.feed
                    )
                        ? data.feed
                        : [],

                assetDairies:
                    Array.isArray(
                        data.assetDairies
                    )
                        ? data.assetDairies
                        : [],

                user:
                    sessionUser

            }
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load general dairy feed."
        );

    }

};


// ==========================================================
// VIEW ADD-ONS
// ==========================================================
//
// GET:
//
//     /dairy/:id/addOns
//
// ==========================================================

exports.viewAddOns = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const sessionUser =
            getSessionUser(req);


        const data =
            await updateService.getDairyPage(
                id,
                getUserId(req)
            );


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        return res.render(
            "addOns",
            {

                title:
                    "Financial Information",

                dairy:
                    data.dairy,

                assetDairies:
                    Array.isArray(
                        data.assetDairies
                    )
                        ? data.assetDairies
                        : [],

                user:
                    sessionUser

            }
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load financial information."
        );

    }

};


// ==========================================================
// RECORD LIABILITY
// ==========================================================

exports.recordLiability = async (
    req,
    res
) => {

    try {

        const dairyId =
            req.params.id;

        const user =
            getSessionUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Unauthorized."
                );

        }


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const {
            amount,
            description,
            date
        } = req.body;


        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {

            return res
                .status(400)
                .send(
                    "Liability amount is required."
                );

        }


        if (
            !description ||
            !String(
                description
            ).trim()
        ) {

            return res
                .status(400)
                .send(
                    "Liability description is required."
                );

        }


        if (
            !date ||
            !String(
                date
            ).trim()
        ) {

            return res
                .status(400)
                .send(
                    "Liability date is required."
                );

        }


        const liabilityAmount =
            Number(amount);


        if (
            !Number.isFinite(
                liabilityAmount
            ) ||
            liabilityAmount < 0
        ) {

            return res
                .status(400)
                .send(
                    "Invalid liability amount."
                );

        }


        await updateService.recordLiability({

            dairyId:
                dairyId,

            amount:
                liabilityAmount,

            description:
                String(
                    description
                ).trim(),

            date:
                String(
                    date
                ).trim(),

            user:
                user

        });


        return res.redirect(
            `/dairy/${dairyId}/addOns`
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to record liability."
        );

    }

};


// ==========================================================
// RECORD REVENUE
// ==========================================================

exports.recordRevenue = async (
    req,
    res
) => {

    try {

        const dairyId =
            req.params.id;

        const user =
            getSessionUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Unauthorized."
                );

        }


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const {
            amount,
            description,
            date
        } = req.body;


        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {

            return res
                .status(400)
                .send(
                    "Revenue amount is required."
                );

        }


        if (
            !description ||
            !String(
                description
            ).trim()
        ) {

            return res
                .status(400)
                .send(
                    "Revenue description is required."
                );

        }


        if (
            !date ||
            !String(
                date
            ).trim()
        ) {

            return res
                .status(400)
                .send(
                    "Revenue date is required."
                );

        }


        const revenueAmount =
            Number(amount);


        if (
            !Number.isFinite(
                revenueAmount
            ) ||
            revenueAmount < 0
        ) {

            return res
                .status(400)
                .send(
                    "Invalid revenue amount."
                );

        }


        await updateService.recordRevenue({

            dairyId:
                dairyId,

            amount:
                revenueAmount,

            description:
                String(
                    description
                ).trim(),

            date:
                String(
                    date
                ).trim(),

            user:
                user

        });


        return res.redirect(
            `/dairy/${dairyId}/addOns`
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to record revenue."
        );

    }

};


// ==========================================================
// TOGGLE MILKING
// ==========================================================

exports.toggleMilking = async (
    req,
    res
) => {

    try {

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Dairy ID is required."

                });

        }


        const dairy =
            await updateService.toggleMilking(
                dairyId
            );


        return res
            .status(200)
            .json({

                success:
                    true,

                isMilking:
                    dairy.isMilking

            });

    } catch (err) {

        console.error(
            "TOGGLE MILKING ERROR:",
            err
        );


        if (
            err.message ===
            "Dairy asset not found."
        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        err.message

                });

        }


        if (
            err.message ===
            "Dairy ID is required."
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        err.message

                });

        }


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Failed to toggle milking status."

            });

    }

};


// ==========================================================
// SWITCH DAIRY
// ==========================================================

exports.switchDairy = async (
    req,
    res
) => {

    try {

        const user =
            getSessionUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Unauthorized."
                );

        }


        if (
            user.role !==
            "dairyWorker"
        ) {

            return res
                .status(403)
                .send(
                    "Only dairy workers can switch Dairy Farms."
                );

        }


        const farmId =
            req.params.id;


        if (!farmId) {

            return res
                .status(400)
                .send(
                    "Dairy Farm ID is required."
                );

        }


        const farm =
            await updateService
                .getAssignedFarmForUser(
                    user._id,
                    farmId
                );


        if (!farm) {

            return res
                .status(403)
                .send(
                    "This Dairy Farm is not assigned to your account."
                );

        }


        return res.redirect(
            `/dairy/${farm._id}`
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to switch Dairy Farm."
        );

    }

};


// ==========================================================
// BOOLEAN MANAGEMENT
// ==========================================================

exports.toggleBoolean = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.toggleBoolean !==
            "function"
        ) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Boolean service is not available."

                });

        }


        const result =
            await updateService.toggleBoolean(
                req.params.animalId,
                req.params.field
            );


        return res.json({

            success:
                true,

            data:
                result

        });

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to update boolean field."
        );

    }

};


exports.getBooleanFields = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.getBooleanData !==
            "function"
        ) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Boolean service is not available."

                });

        }


        const data =
            await updateService.getBooleanData();


        return res.json({

            success:
                true,

            animals:
                Array.isArray(
                    data?.animals
                )
                    ? data.animals
                    : [],

            fields:
                Array.isArray(
                    data?.fields
                )
                    ? data.fields
                    : []

        });

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load boolean fields."
        );

    }

};


// ==========================================================
// GENERAL COMMENT
// ==========================================================

exports.comment = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.comment !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Comment service is not available."
                );

        }


        const result =
            await updateService.comment(
                req,
                res
            );


        return result;

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to add comment."
        );

    }

};


// ==========================================================
// CREATE POST
// ==========================================================

exports.createPost = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.createPost !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Post service is not available."
                );

        }


        return await updateService.createPost(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to create post."
        );

    }

};


// ==========================================================
// PROFILE IMAGE
// ==========================================================

exports.image = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.image !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Image service is not available."
                );

        }


        return await updateService.image(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to update profile image."
        );

    }

};


// ==========================================================
// UPDATE PROFILE
// ==========================================================

exports.updateProfile = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.updateProfile !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Profile update service is not available."
                );

        }


        return await updateService.updateProfile(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to update dairy profile."
        );

    }

};


// ==========================================================
// MEDICAL
// ==========================================================

exports.markMedical = async (
    req,
    res
) => {

    try {

        return await updateService.markMedical(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to mark medical attention."
        );

    }

};


exports.unmarkMedical = async (
    req,
    res
) => {

    try {

        return await updateService.unmarkMedical(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to clear medical attention."
        );

    }

};


// ==========================================================
// MAINTENANCE
// ==========================================================

exports.markMaintenance = async (
    req,
    res
) => {

    try {

        return await updateService.markMaintenance(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to mark maintenance."
        );

    }

};


exports.clearMaintenance = async (
    req,
    res
) => {

    try {

        return await updateService.clearMaintenance(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to clear maintenance."
        );

    }

};


// ==========================================================
// STORAGE CONTENT ITEM
// ==========================================================
//
// GET:
//
//     /dairy/:contentItemId/:dwellNumber
//
// ==========================================================

exports.getContentItem = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.getContentItem !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Content-item service is not available."
                );

        }


        return await updateService.getContentItem(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to load content item."
        );

    }

};


// ==========================================================
// UPDATE STORAGE CONTENT ITEM
// ==========================================================

exports.updateContentItem = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.updateContentItem !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Content-item update service is not available."
                );

        }


        return await updateService.updateContentItem(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to update content item."
        );

    }

};


// ==========================================================
// POST LIKE
// ==========================================================

exports.likePost = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.likePost !==
            "function"
        ) {

            return res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Post like service is not available."

                });

        }


        const result =
            await updateService.likePost(
                req,
                res
            );


        return result;

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to like post."
        );

    }

};


// ==========================================================
// POST COMMENT
// ==========================================================

exports.addPostComment = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.addPostComment !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Post comment service is not available."
                );

        }


        return await updateService.addPostComment(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to add post comment."
        );

    }

};


// ==========================================================
// DELETE POST
// ==========================================================

exports.deletePost = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.deletePost !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Delete post service is not available."
                );

        }


        return await updateService.deletePost(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to delete post."
        );

    }

};


// ==========================================================
// DELETE COMMENT
// ==========================================================

exports.deleteComment = async (
    req,
    res
) => {

    try {

        if (
            typeof updateService.deleteComment !==
            "function"
        ) {

            return res
                .status(500)
                .send(
                    "Delete comment service is not available."
                );

        }


        return await updateService.deleteComment(
            req,
            res
        );

    } catch (err) {

        return sendServiceError(
            res,
            err,
            "Failed to delete comment."
        );

    }

};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    viewPage:
        exports.viewPage,

    viewAssets:
        exports.viewAssets,

    viewGeneral:
        exports.viewGeneral,

    viewAddOns:
        exports.viewAddOns,

    recordLiability:
        exports.recordLiability,

    recordRevenue:
        exports.recordRevenue,

    toggleMilking:
        exports.toggleMilking,

    switchDairy:
        exports.switchDairy,

    toggleBoolean:
        exports.toggleBoolean,

    getBooleanFields:
        exports.getBooleanFields,

    comment:
        exports.comment,

    createPost:
        exports.createPost,

    image:
        exports.image,

    updateProfile:
        exports.updateProfile,

    markMedical:
        exports.markMedical,

    unmarkMedical:
        exports.unmarkMedical,

    markMaintenance:
        exports.markMaintenance,

    clearMaintenance:
        exports.clearMaintenance,

    getContentItem:
        exports.getContentItem,

    updateContentItem:
        exports.updateContentItem,

    likePost:
        exports.likePost,

    addPostComment:
        exports.addPostComment,

    deletePost:
        exports.deletePost,

    deleteComment:
        exports.deleteComment

};