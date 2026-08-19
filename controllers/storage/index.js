// ==========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER
// ==========================================================

const storageService =
    require("../../services/storage");


// ==========================================================
// STORAGE INDEX
// ==========================================================
//
// Displays all available rooms and AgroStores.
//
// Optional query:
//
//     ?type=all
//     ?type=room
//     ?type=agroStore
//
// If no filter is supplied:
//
//     all active storage is displayed.
// ==========================================================

exports.index = async function (
    req,
    res
) {

    try {

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
        // GET STORAGE
        // ==================================================

        const storage =
            await storageService.getStorage({

                type

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(

            "storage/index",

            {

                title:
                    "Storage",

                storage,

                selectedType:
                    type,

                user:
                    req.session.user || null

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


        return res.status(500).render(

            "error",

            {

                title:
                    "Storage Error",

                message:
                    "Unable to load storage information.",

                error

            }

        );

    }

};