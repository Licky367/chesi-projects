// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Loads the complete Dairy update page.
//
// The Boolean component:
//
//     views/update/boolean.ejs
//
// is an INCLUDE inside:
//
//     views/update.ejs
//
// Therefore boolean.ejs is NEVER rendered independently.
//
// The parent update page receives:
//
//     booleanAnimals
//     booleanFields
//
// and passes them naturally to the include.
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
        //
        // boolean.ejs is an INCLUDE.
        //
        // It therefore needs its data from the parent
        // update.ejs render.
        //
        // booleanService supplies:
        //
        //     animals
        //     fields
        //
        // We expose them to update.ejs as:
        //
        //     booleanAnimals
        //     booleanFields
        //
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

                // ------------------------------------------
                // PAGE TITLE
                // ------------------------------------------

                title:
                    "Dairy Profile",


                // ------------------------------------------
                // CURRENT DAIRY / ASSET
                // ------------------------------------------

                dairy:
                    data.dairy,


                // ------------------------------------------
                // FEED
                // ------------------------------------------

                feed:
                    data.feed || [],


                // ------------------------------------------
                // WEEKLY MILK FEED
                // ------------------------------------------

                weeklyFeed:
                    data.weeklyFeeds || null,


                // ------------------------------------------
                // COMMENT COUNT
                // ------------------------------------------

                commentCount:
                    data.commentCount || 0,


                // ------------------------------------------
                // CURRENT FARM ASSETS
                // ------------------------------------------

                assetDairies:
                    data.assetDairies || [],


                // ------------------------------------------
                // ASSIGNED FARMS
                // ------------------------------------------

                assignedFarms:
                    data.assignedFarms || [],


                // ------------------------------------------
                // AGROSTORE INVENTORY
                // ------------------------------------------

                animalFeeds:
                    data.animalFeeds || [],


                // ------------------------------------------
                // ANIMAL FEED ITEM LINKS
                // ------------------------------------------

                itemLinks:
                    itemLinks,


                // ------------------------------------------
                // BOOLEAN ANIMALS
                //
                // Used by:
                //
                //     update/boolean.ejs
                //
                // ------------------------------------------

                booleanAnimals:
                    booleanAnimals,


                // ------------------------------------------
                // BOOLEAN FIELDS
                //
                // Used by:
                //
                //     update/boolean.ejs
                //
                // ------------------------------------------

                booleanFields:
                    booleanFields,


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