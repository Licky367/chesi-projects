// ==========================================================
// controllers/addController.js
// ==========================================================

const addService =
    require("../services/addService");


// ==========================================================
// SHOW ADD PAGE
// ==========================================================

async function showAddPage(
    req,
    res,
    next
) {

    try {

        const data =
            await addService.getAddPageData();


        return res.render(
            "add",
            {

                title:
                    "Add Dairy / Asset",

                dairyBreeds:
                    data.dairyBreeds,

                structures:
                    data.dairyFarms

            }
        );

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// CREATE DAIRY / ASSET
// ==========================================================

async function createDairy(
    req,
    res,
    next
) {

    try {

        const {

            recordType,

            name,

            farmType,

            assetCode,

            structureFarmCode,

            dateOfBirth,

            type,

            mass,

            buyingPrice,

            currentWorth,

            description,

            condition,

            location,

            status

        } =
            req.body;


        // ==================================================
        // BASIC VALIDATION
        // ==================================================

        const validRecordTypes = [

            "dairyFarm",

            "animal",

            "structure"

        ];


        if (
            !validRecordTypes.includes(
                recordType
            )
        ) {

            const error =
                new Error(
                    "Please select a valid record type."
                );

            error.statusCode =
                400;

            throw error;

        }


        if (
            !name ||
            !name.trim()
        ) {

            const error =
                new Error(
                    "Name is required."
                );

            error.statusCode =
                400;

            throw error;

        }


        // ==================================================
        // DAIRY FARM VALIDATION
        // ==================================================

        if (
            recordType ===
            "dairyFarm"
        ) {

            if (
                !farmType ||
                !farmType.trim()
            ) {

                const error =
                    new Error(
                        "Please select the dairy farm type."
                    );

                error.statusCode =
                    400;

                throw error;

            }

        }


        // ==================================================
        // ANIMAL VALIDATION
        // ==================================================

        if (
            recordType ===
            "animal"
        ) {

            if (
                !dateOfBirth
            ) {

                const error =
                    new Error(
                        "Date of birth is required for an animal."
                    );

                error.statusCode =
                    400;

                throw error;

            }


            if (
                !type ||
                !type.trim()
            ) {

                const error =
                    new Error(
                        "Please select the animal breed."
                    );

                error.statusCode =
                    400;

                throw error;

            }

        }


        // ==================================================
        // STRUCTURE VALIDATION
        // ==================================================

        if (
            recordType ===
            "structure"
        ) {

            if (
                !type ||
                !type.trim()
            ) {

                const error =
                    new Error(
                        "Please select the structure or facility type."
                    );

                error.statusCode =
                    400;

                throw error;

            }

        }


        // ==================================================
        // PREPARE DATA
        // ==================================================

        const recordData = {

            recordType,

            name:
                name.trim(),

            farmType:
                farmType?.trim() || null,

            assetCode:
                assetCode?.trim() || null,

            structureFarmCode:
                structureFarmCode?.trim() || null,

            dateOfBirth:
                dateOfBirth || null,

            type:
                type?.trim() || null,

            mass:
                mass !== undefined &&
                mass !== ""
                    ? Number(mass)
                    : null,

            buyingPrice:
                buyingPrice !== undefined &&
                buyingPrice !== ""
                    ? Number(buyingPrice)
                    : 0,

            currentWorth:
                currentWorth !== undefined &&
                currentWorth !== ""
                    ? Number(currentWorth)
                    : 0,

            description:
                description?.trim() || "",

            condition:
                condition?.trim() || "",

            location:
                location?.trim() || "",

            status:
                status || "active",

            profileImage:
                req.file || null

        };


        // ==================================================
        // CREATE
        // ==================================================

        const createdRecord =
            await addService.createDairy(
                recordData
            );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.redirect(
            "/networth"
        );

    } catch (error) {

        /*
         * If an uploaded image exists but
         * creation fails, remove it.
         */

        if (
            req.file &&
            req.file.path
        ) {

            const fs =
                require("fs");

            try {

                if (
                    fs.existsSync(
                        req.file.path
                    )
                ) {

                    fs.unlinkSync(
                        req.file.path
                    );

                }

            } catch (cleanupError) {

                console.error(
                    "Image cleanup failed:",
                    cleanupError
                );

            }

        }


        next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    showAddPage,

    createDairy

};