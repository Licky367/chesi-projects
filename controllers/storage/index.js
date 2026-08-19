// ==========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER
// ==========================================================

const mongoose =
    require("mongoose");

const storageService =
    require("../../services/storage");


// ==========================================================
// STORAGE INDEX
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// Where:
//
//     :id = parent Dairy Farm._id
//
// Example:
//
//     /storage/64f123456789abcdef123456
//
// The service uses this Dairy Farm _id to:
//
//     1. Find the parent Dairy Farm.
//     2. Read its `code`.
//     3. Find storage facilities whose `farmCode`
//        matches that Dairy Farm `code`.
//
// ==========================================================
//
// Optional filter:
//
//     /storage/:id
//
//     /storage/:id?type=all
//
//     /storage/:id?type=room
//
//     /storage/:id?type=agroStore
//
// Default:
//
//     all active storage facilities.
//
// ==========================================================

exports.index = async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // READ PARENT DAIRY FARM ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // VALIDATE ID EXISTS
        // ==================================================

        if (!dairyId) {

            return res.status(400).render(
                "400",
                {

                    title:
                        "Invalid Dairy ID",

                    error:
                        "A Dairy Farm ID is required.",

                    user:
                        req.session?.user || null

                }
            );

        }


        // ==================================================
        // VALIDATE MONGODB OBJECT ID
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            return res.status(400).render(
                "400",
                {

                    title:
                        "Invalid Dairy ID",

                    error:
                        "The supplied Dairy Farm ID is not valid.",

                    user:
                        req.session?.user || null

                }
            );

        }


        // ==================================================
        // READ STORAGE TYPE FILTER
        // ==================================================

        let type =
            String(
                req.query.type || "all"
            ).trim();


        // ==================================================
        // ALLOWED STORAGE TYPES
        // ==================================================

        const allowedTypes = [

            "all",

            "room",

            "agroStore"

        ];


        // ==================================================
        // NORMALIZE INVALID FILTER
        // ==================================================

        if (
            !allowedTypes.includes(type)
        ) {

            type = "all";

        }


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // IMPORTANT:
        //
        // `dairyId` is the parent Dairy Farm's `_id`.
        //
        // The service is responsible for resolving:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //          ↓
        //     DairyStorage.farmCode
        //
        // ==================================================

        const result =
            await storageService.getStorage({

                dairyId,

                type

            });


        // ==================================================
        // SERVICE RESULT
        // ==================================================

        const dairy =
            result?.dairy || null;


        const storage =
            result?.storage || [];


        // ==================================================
        // PARENT DAIRY FARM NOT FOUND
        // ==================================================

        if (!dairy) {

            return res.status(404).render(
                "404",
                {

                    title:
                        "Dairy Farm Not Found",

                    error:
                        "The requested Dairy Farm could not be found.",

                    user:
                        req.session?.user || null

                }
            );

        }


        // ==================================================
        // RENDER STORAGE PAGE
        // ==================================================

        return res.render(
            "storage/index",
            {

                title:
                    "Storage",

                // ------------------------------------------
                // PARENT DAIRY FARM
                // ------------------------------------------

                dairy,

                // ------------------------------------------
                // STORAGE FACILITIES
                // ------------------------------------------

                storage,

                // ------------------------------------------
                // CURRENT FILTER
                // ------------------------------------------

                selectedType:
                    type,

                // ------------------------------------------
                // PARENT DAIRY FARM ID
                // ------------------------------------------

                dairyId:
                    dairy._id,

                // ------------------------------------------
                // PARENT FARM CODE
                // ------------------------------------------

                farmCode:
                    dairy.code,

                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

                user:
                    req.session?.user || null

            }
        );


    } catch (error) {

        // ==================================================
        // ERROR
        // ==================================================

        console.error(
            "Storage index error:",
            error
        );


        // ==================================================
        // GLOBAL ERROR HANDLER
        // ==================================================

        return next(error);

    }

};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = exports;