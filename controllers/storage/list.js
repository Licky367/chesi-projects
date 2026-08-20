// ==========================================================
// controllers/storage/list.js
// STORAGE LIST CONTROLLER
// ==========================================================
//
// HANDLES:
//
//     GET /storage/:id
//
// IMPORTANT ID CONTRACT:
//
//     :id = parent Dairy._id
//
// RELATION:
//
//     req.params.id
//          ↓
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================


const storageService =
    require("../../services/storage");


// ==========================================================
// GET STORAGE PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id = Dairy._id
//
// ==========================================================

async function list(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // GET DAIRY ID
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
        // GET TYPE FILTER
        // ==================================================

        const type =
            storageService.normalizeType(
                req.query.type
            );


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // Service resolves:
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
        // RENDER
        // ==================================================

        return res.render(
            "storage/storage",
            {

                title:
                    "Feed Store",

                dairy:
                    result.dairy,

                storage:
                    result.storage,

                selectedType:
                    result.type,

                dairyId:
                    result.dairy._id,

                farmCode:
                    result.farmCode,

                user:
                    req.session?.user || null

            }
        );

    } catch (error) {

        console.error(
            "STORAGE LIST ERROR:",
            error
        );

        return next(error);
    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = list;