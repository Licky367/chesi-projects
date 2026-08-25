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
        // FARM-OWNED ASSETS
        // ==================================================
        //
        // getDairyPage() already provides assetDairies.
        //
        // Use the same collection used by update.ejs.
        //
        // This is important because the shared create-post
        // composer expects:
        //
        //     assetDairies
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
            Array.isArray(
                data.feed
            )
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
        // ITEM LINKS
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
                //
                // REQUIRED BY:
                //
                //     update/create-post
                //
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


                // ------------------------------------------
                // MEDICAL COMPOSER DATA
                // ------------------------------------------

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