// ==========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER
// ==========================================================
//
// ROUTE:
//
//     GET /storage/:id
//
// IMPORTANT ID CONTRACT
// ----------------------------------------------------------
//
//     req.params.id
//
// IS:
//
//     Dairy._id
//
// It is NOT:
//
//     farmCode
//
// It is NOT:
//
//     storage._id
//
// It is NOT:
//
//     roomNumber
//
// It is the MongoDB _id of the PARENT DAIRY FARM.
//
// Example:
//
//     /storage/68a123456789abcdef123456
//
// means:
//
//     Dairy._id = 68a123456789abcdef123456
//
// The controller then resolves:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// Example:
//
//     Dairy:
//
//         _id  = 68a123456789abcdef123456
//         code = -1
//
//     DairyStorage:
//
//         farmCode = -1
//
// Therefore:
//
//     /storage/68a123456789abcdef123456
//
// correctly loads storage belonging to farm code -1.
//
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

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
        // REQUIRE DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy ID",

                        error:
                            "Dairy Farm ID is required.",

                        user:
                            req.session?.user || null

                    }
                );

        }


        // ==================================================
        // VALIDATE MONGODB OBJECT ID
        // ==================================================
        //
        // This confirms that :id is intended to be a
        // MongoDB Dairy._id.
        //
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy ID",

                        error:
                            "Invalid Dairy ID.",

                        user:
                            req.session?.user || null

                    }
                );

        }


        // ==================================================
        // FIND THE PARENT DAIRY FARM
        // ==================================================
        //
        // THIS IS THE CRITICAL PART.
        //
        // :id is used against Dairy._id.
        //
        // We do NOT do:
        //
        //     Dairy.findOne({ code: dairyId })
        //
        // because dairyId is the MongoDB _id.
        //
        // ==================================================

        const dairy =
            await Dairy
                .findById(dairyId)
                .lean();


        // ==================================================
        // DAIRY FARM NOT FOUND
        // ==================================================

        if (!dairy) {

            return res
                .status(404)
                .render(
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
        // VERIFY THAT THE ID BELONGS TO A PARENT
        // DAIRY FARM
        // ==================================================
        //
        // According to models/dairy.js:
        //
        //     code < 0 = Dairy Farm
        //
        //     code > 0 = Animal
        //
        //     code === null = Structure / Asset
        //
        // Therefore the storage page must only accept
        // a Dairy Farm.
        //
        // ==================================================

        if (
            dairy.code === null ||
            dairy.code === undefined ||
            Number(dairy.code) >= 0
        ) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy Farm",

                        error:
                            "The supplied ID does not belong to a parent Dairy Farm.",

                        user:
                            req.session?.user || null

                    }
                );

        }


        // ==================================================
        // PARENT FARM CODE
        // ==================================================
        //
        // Example:
        //
        //     dairy._id = 68abc...
        //     dairy.code = -1
        //
        // Storage records belonging to this farm must have:
        //
        //     farmCode = -1
        //
        // ==================================================

        const farmCode =
            Number(
                dairy.code
            );


        // ==================================================
        // READ STORAGE TYPE
        // ==================================================

        let type =
            String(
                req.query.type || "all"
            )
            .trim();


        // ==================================================
        // ALLOWED STORAGE TYPES
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
        // GET STORAGE
        // ==================================================
        //
        // IMPORTANT:
        //
        // We pass BOTH:
        //
        //     dairyId
        //
        // and
        //
        //     farmCode
        //
        // The service must use farmCode to query:
        //
        //     DairyStorage.farmCode
        //
        // ==================================================

        const storage =
            await storageService.getStorage({

                dairyId,

                farmCode,

                type

            });


        // ==================================================
        // RENDER STORAGE PAGE
        // ==================================================

        return res.render(

            "storage/index",

            {

                title:
                    "Feed Store",

                // ------------------------------------------
                // PARENT DAIRY FARM
                // ------------------------------------------

                dairy,

                // ------------------------------------------
                // STORAGE BELONGING TO THIS FARM
                // ------------------------------------------

                storage:
                    storage || [],

                // ------------------------------------------
                // SELECTED FILTER
                // ------------------------------------------

                selectedType:
                    type,

                // ------------------------------------------
                // ACTUAL DAIRY._id
                //
                // This is what /storage/:id represents.
                // ------------------------------------------

                dairyId:
                    dairy._id,

                // ------------------------------------------
                // PARENT FARM CODE
                //
                // This is what DairyStorage.farmCode uses.
                // ------------------------------------------

                farmCode,

                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

                user:
                    req.session?.user || null

            }

        );


    } catch (error) {

        // ==================================================
        // LOG ERROR
        // ==================================================

        console.error(
            "STORAGE INDEX ERROR:",
            error
        );


        // ==================================================
        // GLOBAL ERROR HANDLER
        // ==================================================

        return next(error);

    }

};