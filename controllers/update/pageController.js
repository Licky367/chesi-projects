// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Loads the complete Dairy update page and passes all
// required variables to views/update.ejs.
//
// IMPORTANT
// ----------------------------------------------------------
//
// views/update/boolean.ejs is NOT a standalone page.
//
// It is an INCLUDE rendered by:
//
//     views/update.ejs
//
// Therefore boolean data is loaded here and passed to
// update.ejs.
//
// BOOLEAN ANIMAL ELIGIBILITY
// ----------------------------------------------------------
//
// An animal is displayed by boolean.ejs when:
//
//     1. code is a positive EVEN number
//
// OR
//
//     2. gender is female
//
// The boolean include itself is rendered by update.ejs.
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


        // ==================================================
        // SAFE ITEM-LINK ARRAY
        // ==================================================

        const itemLinks =
            Array.isArray(
                resolvedItemLinks
            )
                ? resolvedItemLinks
                : [];


        // ==================================================
        // GET BOOLEAN DATA
        // ==================================================
        //
        // boolean.ejs is an INCLUDE inside update.ejs.
        //
        // It therefore receives its data through the parent
        // update.ejs render.
        //
        // ==================================================

        const booleanData =
            await updateService.getBooleanData();


        // ==================================================
        // SAFE BOOLEAN ANIMAL ARRAY
        // ==================================================

        const booleanAnimals =
            Array.isArray(
                booleanData &&
                booleanData.animals
            )
                ? booleanData.animals
                : [];


        // ==================================================
        // SAFE BOOLEAN FIELD ARRAY
        // ==================================================

        const booleanFields =
            Array.isArray(
                booleanData &&
                booleanData.fields
            )
                ? booleanData.fields
                : [];


        // ==================================================
        // DETERMINE PAGE FROM CODE
        //
        // NEGATIVE CODE:
        //
        //     Dairy Farm
        //     -> update.ejs
        //
        // POSITIVE CODE:
        //
        //     Animal
        //     -> dairySet.ejs
        //
        // NULL / UNDEFINED:
        //
        //     Structure / Machine / Tool
        //     -> dairySet.ejs
        //
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
        // RENDER
        // ==================================================
        //
        // BOOLEAN DATA IS PASSED TO update.ejs.
        //
        // update.ejs is responsible for including:
        //
        //     update/boolean.ejs
        //
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
                //     views/update/boolean.ejs
                //
                // boolean.ejs is an INCLUDE inside
                // views/update.ejs.
                // ------------------------------------------

                booleanAnimals:
                    booleanAnimals,


                // ------------------------------------------
                // BOOLEAN FIELDS
                //
                // Boolean fields discovered from the
                // Dairy schema.
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

                    success:
                        false,

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

                    success:
                        false,

                    message:
                        "Dairy ID is required."

                });

        }


        // ==================================================
        // TOGGLE THROUGH SERVICE
        // ==================================================

        const dairy =
            await updateService.toggleMilking(
                dairyId
            );


        // ==================================================
        // SUCCESS RESPONSE
        // ==================================================

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

                    success:
                        false,

                    message:
                        err.message

                });

        }


        // ==================================================
        // BAD REQUEST
        // ==================================================

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


        // ==================================================
        // SERVER ERROR
        // ==================================================

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
// SWITCH DAIRY FARM
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
        // ROLE CHECK
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
        // VERIFY ASSIGNED FARM
        // ==================================================

        const farm =
            await updateService
                .getAssignedFarmForUser(
                    user._id,
                    farmId
                );


        // ==================================================
        // FARM NOT ASSIGNED
        // ==================================================

        if (!farm) {

            return res
                .status(403)
                .send(
                    "This Dairy Farm is not assigned to your account."
                );

        }


        // ==================================================
        // SWITCH
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