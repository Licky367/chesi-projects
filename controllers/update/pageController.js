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
//     GET /dairy/:id
//
//     GET /dairy/:id/general
//
// The normal Dairy Farm page renders:
//
//     views/update.ejs
//
// The General page renders:
//
//     views/updateGeneral.ejs
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
        //
        // Dairy Farm:
        //
        //     code < 0
        //
        // Animal:
        //
        //     code > 0
        //
        // Structure / facility:
        //
        //     code === null
        //
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
        //
        // getDairyPage() already supplies assetDairies for
        // the current Dairy Farm.
        //
        // We deliberately derive the medical collections
        // from THIS collection.
        //
        // This is important:
        //
        //     We do NOT query every positive-code Dairy record
        //     globally.
        //
        // Therefore an animal belonging to another Dairy Farm
        // cannot accidentally appear in this farm's composer.
        //
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
        //
        // These are positive-code Dairy records belonging to
        // the CURRENT Dairy Farm whose medical attention is
        // currently NOT marked.
        //
        // Used by:
        //
        //     views/update/composers/medic.ejs
        //
        // ==================================================

        const medicalDairies =
            farmAssets.filter(
                function (animal) {

                    return (
                        isPositiveCode(animal) &&
                        isUnmarkedMedical(animal)
                    );

                }
            );


        // ==================================================
        // MEDICAL ANIMALS
        // ==================================================
        //
        // This is kept as a separate collection for the
        // medical-animal composer.
        //
        // At present both collections are derived from the
        // same farm-owned asset collection because positive
        // Dairy codes represent animals.
        //
        // ==================================================

        const medicalAnimals =
            farmAssets.filter(
                function (animal) {

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

                // ------------------------------------------
                // PAGE TITLE
                // ------------------------------------------

                title:
                    "Dairy Profile",


                // ------------------------------------------
                // CURRENT DAIRY / FARM
                // ------------------------------------------

                dairy:
                    data.dairy,


                // ------------------------------------------
                // MAIN FEED
                // ------------------------------------------

                feed:
                    feed,


                // ------------------------------------------
                // WEEKLY FEED
                // ------------------------------------------

                weeklyFeed:
                    weeklyFeed,


                // ------------------------------------------
                // COMMENTS
                // ------------------------------------------

                commentCount:
                    commentCount,


                // ------------------------------------------
                // CURRENT FARM ASSETS
                // ------------------------------------------

                assetDairies:
                    farmAssets,


                // ------------------------------------------
                // ASSIGNED FARMS
                // ------------------------------------------

                assignedFarms:
                    assignedFarms,


                // ------------------------------------------
                // ANIMAL FEEDS
                // ------------------------------------------

                animalFeeds:
                    animalFeeds,


                // ------------------------------------------
                // ITEM LINKS
                // ------------------------------------------

                itemLinks:
                    itemLinks,


                // ------------------------------------------
                // BOOLEAN DATA
                // ------------------------------------------

                booleanAnimals:
                    booleanAnimals,


                booleanFields:
                    booleanFields,


                // =================================================
                // MEDICAL COMPOSER DATA
                // =================================================
                //
                // IMPORTANT:
                //
                // These variables MUST be present because
                // update.ejs includes:
                //
                //     update/composers/medic.ejs
                //
                // and:
                //
                //     update/composers/!medic.ejs
                //
                // =================================================

                medicalDairies:
                    medicalDairies,


                medicalAnimals:
                    medicalAnimals,


                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

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
// PURPOSE:
//
//     Render ONLY the chronological General feed.
//
// ==========================================================

exports.viewGeneral =
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
        // GET DAIRY PAGE DATA
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
        // VERIFY CURRENT RECORD IS A DAIRY FARM
        // ==================================================

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


        // ==================================================
        // RENDER GENERAL FEED
        // ==================================================

        return res.render(
            "updateGeneral",
            {

                // ------------------------------------------
                // PAGE TITLE
                // ------------------------------------------

                title:
                    "General Updates",


                // ------------------------------------------
                // CURRENT DAIRY FARM
                // ------------------------------------------

                dairy:
                    data.dairy,


                // ------------------------------------------
                // MAIN FEED
                // ------------------------------------------

                feed:
                    Array.isArray(
                        data.feed
                    )
                        ? data.feed
                        : [],


                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

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

        // ==================================================
        // AUTHENTICATION
        // ==================================================

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


        // ==================================================
        // DAIRY ID
        // ==================================================

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


        // ==================================================
        // TOGGLE
        // ==================================================

        const dairy =
            await updateService.toggleMilking(
                dairyId
            );


        // ==================================================
        // RESPONSE
        // ==================================================

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


        // ==================================================
        // NOT FOUND
        // ==================================================

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


        // ==================================================
        // BAD ID
        // ==================================================

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


        // ==================================================
        // SERVER ERROR
        // ==================================================

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

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        // ==================================================
        // ROLE
        // ==================================================

        if (
            user.role !== "dairyWorker"
        ) {

            return res
                .status(403)
                .send(
                    "Only dairy workers can switch Dairy Farms."
                );

        }


        // ==================================================
        // FARM ID
        // ==================================================

        const farmId =
            req.params.id;


        if (!farmId) {

            return res
                .status(400)
                .send(
                    "Dairy Farm ID is required."
                );

        }


        // ==================================================
        // VERIFY ASSIGNMENT
        // ==================================================

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


        // ==================================================
        // REDIRECT
        // ==================================================

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