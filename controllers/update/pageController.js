// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// =========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles:
//
//     GET /dairy/:id
//
//     GET /dairy/:id/general
//
//     GET /dairy/:id/addOns
//
// The normal Dairy Farm page renders:
//
//     views/update.ejs
//
// The General page renders:
//
//     views/updateGeneral.ejs
//
// The Add-Ons page renders:
//
//     views/update/addOns.ejs
//
// ==========================================================


const updateService =
    require("../../services/update");


// ==========================================================
// SMALL INTERNAL HELPERS
// ==========================================================
//
// These helpers keep the controller safe when MongoDB fields
// are null, undefined, strings, or numbers.
// ==========================================================


function isPositiveCode(dairy) {

    if (
        !dairy ||
        dairy.code === null ||
        dairy.code === undefined
    ) {

        return false;

    }


    return Number(dairy.code) > 0;

}


function isUnmarkedMedical(dairy) {

    return Boolean(
        dairy &&
        dairy.medicalAttention &&
        dairy.medicalAttention.isMarked === false
    );

}


// ==========================================================
// VIEW DAIRY PROFILE PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:id
//
// ==========================================================

exports.viewPage =
async (req, res) => {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

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


        // ==================================================
        // LOGGED-IN USER
        // ==================================================

        const sessionUser =
            req.session.user || null;


        const userId =
            sessionUser
                ? sessionUser._id
                : null;


        // ==================================================
        // GET COMPLETE DAIRY PAGE DATA
        // ==================================================

        const data =
            await updateService.getDairyPage(
                id,
                userId
            );


        // ==================================================
        // VERIFY DAIRY EXISTS
        // ==================================================

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


        // ==================================================
        // GET ITEM LINKS
        // ==================================================

        const resolvedItemLinks =
            await updateService.getItemLinks(
                id
            );


        const itemLinks =
            Array.isArray(
                resolvedItemLinks
            )
                ? resolvedItemLinks
                : [];


        // ==================================================
        // BOOLEAN DATA
        // ==================================================

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
                    booleanData &&
                    booleanData.animals
                )
                    ? booleanData.animals
                    : [];


            booleanFields =
                Array.isArray(
                    booleanData &&
                    booleanData.fields
                )
                    ? booleanData.fields
                    : [];

        }


        // ==================================================
        // DETERMINE CURRENT PAGE TYPE
        // ==================================================

        const isDairyFarm =
            data.dairy.code !== null &&

            data.dairy.code !== undefined &&

            Number(
                data.dairy.code
            ) < 0;


        // ==================================================
        // FARM-OWNED ASSETS
        // ==================================================

        const farmAssets =
            Array.isArray(
                data.assetDairies
            )
                ? data.assetDairies
                : [];


        // ==================================================
        // MEDICAL DAIRIES
        // ==================================================

        const medicalDairies =
            farmAssets.filter(
                function(animal) {

                    return (
                        isPositiveCode(animal) &&
                        isUnmarkedMedical(animal)
                    );

                }
            );


        // ==================================================
        // MEDICAL ANIMALS
        // ==================================================

        const medicalAnimals =
            farmAssets.filter(
                function(animal) {

                    return (
                        isPositiveCode(animal) &&
                        isUnmarkedMedical(animal)
                    );

                }
            );


        // ==================================================
        // OTHER PAGE COLLECTIONS
        // ==================================================

        const feed =
            Array.isArray(data.feed)
                ? data.feed
                : [];


        const weeklyFeed =
            data.weeklyFeeds || null;


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


        // ==================================================
        // SELECT VIEW
        // ==================================================

        const view =
            isDairyFarm
                ? "update"
                : "dairySet";


        // ==================================================
        // RENDER PAGE
        // ==================================================

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

        console.error(
            "VIEW PAGE ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load dairy profile"
            );

    }

};


// ==========================================================
// VIEW GENERAL FEED
// ==========================================================
//
// GET:
//
//     /dairy/:id/general
//
// ==========================================================

exports.viewGeneral =
async (req, res) => {

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
            req.session.user || null;


        const userId =
            sessionUser
                ? sessionUser._id
                : null;


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


        const assetDairies =
            Array.isArray(
                data.assetDairies
            )
                ? data.assetDairies
                : [];


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
                    assetDairies,

                user:
                    sessionUser

            }
        );

    } catch (err) {

        console.error(
            "VIEW GENERAL FEED ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load general dairy feed."
            );

    }

};


// ==========================================================
// VIEW FINANCIAL ADD-ONS
// ==========================================================
//
// GET:
//
//     /dairy/:id/addOns
//
// PURPOSE
// ----------------------------------------------------------
//
// Renders:
//
//     views/update/addOns.ejs
//
// Provides:
//
//     dairy
//
//     assetDairies
//
//     user
//
// ==========================================================

exports.viewAddOns =
async (req, res) => {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

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


        // ==================================================
        // LOGGED-IN USER
        // ==================================================

        const sessionUser =
            req.session.user || null;


        const userId =
            sessionUser
                ? sessionUser._id
                : null;


        // ==================================================
        // GET COMPLETE DAIRY PAGE DATA
        // ==================================================

        const data =
            await updateService.getDairyPage(
                id,
                userId
            );


        // ==================================================
        // VERIFY DAIRY EXISTS
        // ==================================================

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


        // ==================================================
        // ASSET DAIRIES
        // ==================================================

        const assetDairies =
            Array.isArray(
                data.assetDairies
            )
                ? data.assetDairies
                : [];


        // ==================================================
        // RENDER PAGE
        // ==================================================

        return res.render(
            "addOns",
            {

                title:
                    "Financial Information",

                dairy:
                    data.dairy,

                assetDairies:
                    assetDairies,

                user:
                    sessionUser

            }
        );

    } catch (err) {

        console.error(
            "VIEW ADD-ONS ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load financial information."
            );

    }

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// POST:
//
//     /dairy/:id/toggle-milking
//
// ==========================================================

exports.toggleMilking =
async (req, res) => {

    try {

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized"

                });

        }


        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .json({

                    success: false,

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

                success: true,

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

                    success: false,

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

                    success: false,

                    message:
                        err.message

                });

        }


        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Failed to toggle milking status."

            });

    }

};


// ==========================================================
// SWITCH DAIRY FARM
// ==========================================================
//
// GET:
//
//     /dairy/:id/switch
//
// ==========================================================

exports.switchDairy =
async (req, res) => {

    try {

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        const user =
            req.session.user;


        if (
            user.role !== "dairyWorker"
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

        console.error(
            "SWITCH DAIRY ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to switch Dairy Farm."
            );

    }

};