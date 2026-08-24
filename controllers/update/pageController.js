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
// updateGeneral.ejs is FEED ONLY.
//
// ==========================================================


const updateService =
    require("../../services/update");


// ==========================================================
// VIEW DAIRY PROFILE PAGE
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
        // DETERMINE PAGE FROM CODE
        // ==================================================

        const isDairyFarm =
            data.dairy &&

            data.dairy.code !== null &&

            data.dairy.code !== undefined &&

            Number(
                data.dairy.code
            ) < 0;


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
                    data.feed || [],

                weeklyFeed:
                    data.weeklyFeeds || null,

                commentCount:
                    data.commentCount || 0,

                assetDairies:
                    data.assetDairies || [],

                assignedFarms:
                    data.assignedFarms || [],

                animalFeeds:
                    data.animalFeeds || [],

                itemLinks:
                    itemLinks,

                booleanAnimals:
                    booleanAnimals,

                booleanFields:
                    booleanFields,

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
// ----------------------------------------------------------
//
// Renders:
//
//     views/updateGeneral.ejs
//
// This page intentionally renders ONLY the main feed.
//
// It does NOT render:
//
//     - asset cards
//     - boolean management
//     - item links
//     - asset sidebar
//     - create-post
//     - H1
//     - other fixed update-page components
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
        //
        // We deliberately use the same service that builds
        // the normal update feed.
        //
        // This ensures updateGeneral.ejs receives the same
        // chronological feed data.
        //
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
        // VERIFY THIS IS A DAIRY FARM
        // ==================================================
        //
        // A Dairy Farm is represented by:
        //
        //     code < 0
        //
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
                    "General feed is only available for a Dairy Farm."
                );

        }


        // ==================================================
        // RENDER GENERAL FEED
        // ==================================================
        //
        // IMPORTANT:
        //
        // updateGeneral.ejs only needs:
        //
        //     dairy
        //     feed
        //     user
        //
        // No Boolean data or asset collections are required.
        //
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
                // PARENT DAIRY FARM
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