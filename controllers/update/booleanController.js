// ==========================================================
// controllers/update/booleanController.js
// ==========================================================
//
// BOOLEAN CONTROLLER
//
// PURPOSE
// ----------------------------------------------------------
//
// Supplies Boolean-management data to the parent:
//
//     views/update.ejs
//
// The Boolean UI itself lives in:
//
//     views/update/boolean.ejs
//
// IMPORTANT
// ----------------------------------------------------------
//
// boolean.ejs is an INCLUDE/PARTIAL.
//
// It must NOT be rendered directly.
//
// The parent update page is responsible for rendering:
//
//     views/update.ejs
//
// and passing:
//
//     animals
//     booleanFields
//
// to the included Boolean partial.
//
// ==========================================================

const updateService =
    require("../../services/update");



/* ==========================================================
   GET BOOLEAN DATA
========================================================== */

/**
 * Get the data required by:
 *
 *     views/update/boolean.ejs
 *
 * This function does NOT render a view.
 *
 * The parent update controller/page should use the
 * returned data when rendering views/update.ejs.
 */
async function getBooleanData() {

    const data =
        await updateService
            .getBooleanPageData();


    return {

        animals:
            Array.isArray(
                data.animals
            )
                ? data.animals
                : [],

        booleanFields:
            Array.isArray(
                data.booleanFields
            )
                ? data.booleanFields
                : []

    };

}



/* ==========================================================
   UPDATE BOOLEAN
========================================================== */

/**
 * Toggle/update one Boolean field belonging to
 * one eligible Dairy animal.
 *
 * Expected request:
 *
 *     PUT /.../:animalId
 *
 * Body:
 *
 *     {
 *         field: "isMilking",
 *         value: true
 *     }
 *
 * The service performs the actual validation
 * and database update.
 */
async function updateBoolean(
    req,
    res
) {

    try {

        /* ==================================================
           ANIMAL ID
        ================================================== */

        const animalId =
            String(
                req.params.animalId ||
                ""
            ).trim();


        /* ==================================================
           FIELD
        ================================================== */

        const field =
            String(
                req.body &&
                req.body.field
                    ? req.body.field
                    : ""
            ).trim();


        /* ==================================================
           VALUE
        ================================================== */

        let value =
            req.body
                ? req.body.value
                : undefined;


        /*
         * JSON requests normally provide a real Boolean.
         *
         * If the frontend sends form-style strings,
         * convert them safely.
         */

        if (
            typeof value ===
            "string"
        ) {

            const normalized =
                value
                    .trim()
                    .toLowerCase();


            if (
                normalized ===
                "true"
            ) {

                value = true;

            } else if (
                normalized ===
                "false"
            ) {

                value = false;

            }

        }



        /* ==================================================
           BASIC VALIDATION
        ================================================== */

        if (!animalId) {

            return res.status(400).json({

                success: false,

                message:
                    "Animal ID is required."

            });

        }


        if (!field) {

            return res.status(400).json({

                success: false,

                message:
                    "Boolean field is required."

            });

        }


        if (
            typeof value !==
            "boolean"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Boolean value must be true or false."

            });

        }



        /* ==================================================
           DATABASE UPDATE
        ================================================== */

        const updatedAnimal =
            await updateService
                .updateBoolean(
                    animalId,
                    field,
                    value
                );


        /* ==================================================
           SUCCESS
        ================================================== */

        return res.status(200).json({

            success: true,

            message:
                "Boolean updated successfully.",

            animal:
                updatedAnimal

        });

    } catch (error) {

        console.error(
            "BOOLEAN UPDATE ERROR:",
            error
        );


        const message =
            error &&
            error.message
                ? error.message
                : "Failed to update Boolean.";


        /* ==================================================
           EXPECTED VALIDATION ERRORS
        ================================================== */

        const knownErrors = [

            "Boolean value is required.",

            "Invalid boolean field.",

            "Eligible animal not found."

        ];


        if (
            knownErrors.includes(
                message
            )
        ) {

            return res.status(400).json({

                success: false,

                message

            });

        }


        /* ==================================================
           SERVER ERROR
        ================================================== */

        return res.status(500).json({

            success: false,

            message:
                "Failed to update Boolean."

        });

    }

}



/* ==========================================================
   GET BOOLEAN FIELD DEFINITIONS
========================================================== */

/**
 * Returns the Boolean fields discovered from
 * the Dairy schema.
 *
 * This is optional for the frontend because the
 * parent page can already receive booleanFields.
 *
 * It is useful if boolean.ejs later needs to
 * refresh its field definitions through AJAX.
 */
function getBooleanFields(
    req,
    res
) {

    try {

        const booleanFields =
            updateService
                .getBooleanFields();


        return res.status(200).json({

            success: true,

            booleanFields

        });

    } catch (error) {

        console.error(
            "BOOLEAN FIELDS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load Boolean fields."

        });

    }

}



/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getBooleanData,

    updateBoolean,

    getBooleanFields

};