// ==========================================================
// controllers/milkController.js
// ==========================================================

const Dairy =
    require("../models/dairy");

const Milk =
    require("../models/milk");


// ==========================================================
// GET MILK HISTORY
// ==========================================================
//
// URL:
//
//     GET /milk/history/:dairyId
//
// ACCESS RULE:
//
//     Milk history can be viewed for:
//
//         • Any female animal
//         • Any animal whose code is EVEN
//
// IMPORTANT:
//
//     There is deliberately NO requirement for the animal
//     to be assigned to a dairy farm.
//
//     Assignment to a dairy farm has nothing to do with
//     whether the animal's milk history can be viewed.
//
// ==========================================================

exports.getMilkHistory = async (
    req,
    res
) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // ==================================================
        // DAIRY ANIMAL ID
        // ==================================================

        const {
            dairyId
        } = req.params;


        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy animal ID is required."
                );

        }


        // ==================================================
        // FIND ANIMAL
        // ==================================================

        const dairy =
            await Dairy.findById(
                dairyId
            );


        if (!dairy) {

            return res
                .status(404)
                .send(
                    "Dairy animal not found."
                );

        }


        // ==================================================
        // FEMALE CHECK
        // ==================================================
        //
        // Use the existing virtual/property from the
        // Dairy model.
        //
        // ==================================================

        const isFemale =
            dairy.isFemale === true;


        // ==================================================
        // CODE CHECK
        // ==================================================
        //
        // Determine whether the animal has an even code.
        //
        // Examples:
        //
        //     2       -> even
        //     4       -> even
        //     102     -> even
        //     101     -> odd
        //
        // If codes contain text, the numeric portion is used.
        //
        // ==================================================

        const code =
            dairy.code !== undefined &&
            dairy.code !== null
                ? String(
                    dairy.code
                  ).trim()
                : "";


        const numericParts =
            code.match(
                /\d+/g
            );


        let isEvenCode =
            false;


        if (
            numericParts &&
            numericParts.length > 0
        ) {

            const numericCode =
                Number(
                    numericParts[
                        numericParts.length - 1
                    ]
                );


            if (
                Number.isFinite(
                    numericCode
                )
            ) {

                isEvenCode =
                    numericCode % 2 === 0;

            }

        }


        // ==================================================
        // MILK HISTORY ACCESS
        // ==================================================
        //
        // NO ASSIGNMENT CHECK HERE.
        //
        // An animal does NOT need to belong to or be
        // assigned to a dairy farm.
        //
        // ==================================================

        if (
            !isFemale &&
            !isEvenCode
        ) {

            return res
                .status(403)
                .send(
                    "Milk history is only available for female animals or animals with an even code."
                );

        }


        // ==================================================
        // GET MILK RECORDS
        // ==================================================

        const milkRecords =
            await Milk.find({

                dairy:
                    dairyId

            })
            .sort({

                date:
                    -1,

                createdAt:
                    -1

            })
            .lean();


        // ==================================================
        // RENDER MILK HISTORY
        // ==================================================

        return res.render(

            "milkHistory",

            {

                dairy,

                milkRecords,

                user,

                isAdmin:
                    user.role === "admin",

                isFemale,

                isEvenCode

            }

        );


    } catch (err) {

        console.error(
            "GET MILK HISTORY ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load milk history."
            );

    }

};