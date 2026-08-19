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
//     :id = Dairy._id
//
// The controller does NOT treat :id as farmCode.
//
// It represents the MongoDB _id of the Dairy.
//
// The service will:
//
//     1. Find the Dairy using _id.
//     2. Read dairy.code.
//     3. Find DairyStorage records where:
//
//            farmCode === dairy.code
//
//     4. Apply the optional storage type filter.
//
// ==========================================================
//
// Optional query:
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
//     all active storage.
//
// ==========================================================

exports.index = async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // READ DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // VALIDATE DAIRY ID
        // ==================================================

        if (
            !dairyId
        ) {

            return res.status(400).render(

                "400",

                {

                    title:
                        "Invalid Dairy",

                    error:
                        "A Dairy ID is required.",

                    user:
                        req.session?.user || null

                }

            );

        }


        // ==================================================
        // MONGODB OBJECT ID VALIDATION
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
                        "The supplied Dairy ID is not valid.",

                    user:
                        req.session?.user || null

                }

            );

        }


        // ==================================================
        // READ FILTER
        // ==================================================

        let type =
            String(
                req.query.type || "all"
            )
            .trim();


        // ==================================================
        // NORMALIZE FILTER
        // ==================================================

        const allowedTypes = [

            "all",

            "room",

            "agroStore"

        ];


        if (
            !allowedTypes.includes(type)
        ) {

            type = "all";

        }


        // ==================================================
        // GET STORAGE FOR DAIRY
        // ==================================================
        //
        // The service receives the Dairy _id.
        //
        // It is responsible for resolving:
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
        // GET VALUES FROM SERVICE
        // ==================================================
        //
        // The service should return:
        //
        // {
        //
        //     dairy,
        //
        //     storage
        //
        // }
        //
        // This keeps the controller independent from the
        // actual DairyStorage lookup implementation.
        //
        // ==================================================

        const dairy =
            result?.dairy || null;


        const storage =
            result?.storage || [];


        // ==================================================
        // DAIRY NOT FOUND
        // ==================================================

        if (
            !dairy
        ) {

            return res.status(404).render(

                "404",

                {

                    title:
                        "Dairy Not Found",

                    error:
                        "The requested Dairy farm could not be found.",

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

                dairy,

                storage,

                selectedType:
                    type,

                dairyId:
                    dairy._id,

                farmCode:
                    dairy.code,

                user:
                    req.session?.user || null

            }

        );


    } catch (error) {

        // ==================================================
        // LOG ERROR
        // ==================================================

        console.error(
            "Storage index error:",
            error
        );


        // ==================================================
        // PASS TO GLOBAL ERROR HANDLER
        // ==================================================
        //
        // Your server.js already has a global error
        // handler, so there is no need to duplicate the
        // entire error rendering logic here.
        //
        // ==================================================

        return next(error);

    }

};