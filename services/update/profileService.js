// ==========================================================
// services/update/profileService.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const Update =
    require("../../models/Update");

const Milk =
    require("../../models/milk");


// ==========================================================
// 🟦 UPDATE PROFILE IMAGES
// ==========================================================
//
// Supports:
//
//     • Admin updating ANY dairy profile
//     • Multiple profile images
//     • Maximum 5 profile images
//     • First image is the primary image
//     • `profileImage` remains synchronized
//     • Feed update is created
//
// IMPORTANT:
//
// There is NO dairy-farm assignment check.
//
// The Dairy document is identified directly by:
//
//     dairyId
//
// Authorization is handled by the controller.
//
// Expected input:
//
//     {
//         dairyId,
//         userId,
//         images: [
//             "image-1.jpg",
//             "image-2.jpg"
//         ],
//         isAdmin: true
//     }
//
// ==========================================================

exports.updateImage = async ({

    dairyId,

    userId,

    images = [],

    isAdmin = false

}) => {

    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (!dairyId) {

        const error =
            new Error(
                "Dairy profile ID is required."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE MONGODB OBJECT ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid dairy profile ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy profile not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // NORMALIZE IMAGES
    // ======================================================

    const normalizedImages =
        Array.isArray(images)

            ? images
                .filter(Boolean)
                .map(
                    image =>
                        String(image).trim()
                )
                .filter(
                    image =>
                        image.length > 0
                )

            : [];


    // ======================================================
    // VALIDATE IMAGE COUNT
    // ======================================================

    if (
        normalizedImages.length === 0
    ) {

        const error =
            new Error(
                "At least one profile image is required."
            );

        error.status = 400;

        throw error;

    }


    if (
        normalizedImages.length > 5
    ) {

        const error =
            new Error(
                "A dairy profile can have at most 5 images."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // REMOVE DUPLICATE IMAGE PATHS
    // ======================================================

    const uniqueImages =
        [
            ...new Set(
                normalizedImages
            )
        ];


    // ======================================================
    // PRIMARY IMAGE
    // ======================================================
    //
    // The first image is the primary/display image.
    //
    // ======================================================

    const primaryImage =
        uniqueImages[0];


    // ======================================================
    // SAVE PROFILE IMAGES
    // ======================================================

    dairy.profileImages =
        uniqueImages;


    // ======================================================
    // BACKWARD COMPATIBILITY
    // ======================================================
    //
    // Existing application code may still read:
    //
    //     dairy.profileImage
    //
    // Keep it synchronized with the first image.
    //
    // ======================================================

    dairy.profileImage =
        primaryImage;


    // ======================================================
    // OPTIONAL displayImage
    // ======================================================
    //
    // Only attempt to update this field when it exists
    // in the Dairy schema.
    //
    // ======================================================

    const schemaPaths =
        dairy.schema &&
        dairy.schema.paths
            ? dairy.schema.paths
            : {};


    if (
        Object.prototype.hasOwnProperty.call(
            schemaPaths,
            "displayImage"
        )
    ) {

        dairy.displayImage =
            primaryImage;

    }


    // ======================================================
    // SAVE DAIRY
    // ======================================================

    await dairy.save();


    // ======================================================
    // CREATE FEED UPDATE
    // ======================================================
    //
    // Update currently stores one image in `image`.
    //
    // Therefore the primary image is stored here.
    //
    // ======================================================

    const update =
        await Update.create({

            dairy:
                dairyId,

            user:
                userId || undefined,

            userName:
                isAdmin === true
                    ? "Administrator"
                    : "System",

            type:
                "image",

            image:
                primaryImage

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        update,

        dairy,

        profileImages:
            uniqueImages,

        profileImage:
            primaryImage,

        displayImage:
            primaryImage,

        createdAt:
            update.createdAt

    };

};



// ==========================================================
// 🗑 DELETE DAIRY PROFILE
// ==========================================================
//
// Deletes:
//
//     • Feed updates belonging to the Dairy
//     • Milk records belonging to the Dairy
//     • Dairy profile itself
//
// Authorization is handled by the controller.
//
// IMPORTANT:
//
// No farm-assignment logic is used.
//
// ==========================================================

exports.deleteProfile = async (
    dairyId
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (!dairyId) {

        const error =
            new Error(
                "Dairy profile ID is required."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE MONGODB OBJECT ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid dairy profile ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY DAIRY EXISTS
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy profile not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // DELETE FEED UPDATES
    // ======================================================

    await Update.deleteMany({

        dairy:
            dairyId

    });


    // ======================================================
    // DELETE MILK RECORDS
    // ======================================================

    await Milk.deleteMany({

        dairy:
            dairyId

    });


    // ======================================================
    // DELETE DAIRY PROFILE
    // ======================================================

    await Dairy.findByIdAndDelete(
        dairyId
    );


    // ======================================================
    // SUCCESS
    // ======================================================

    return true;

};



// ==========================================================
// 📝 UPDATE PROFILE INFORMATION
// ==========================================================
//
// Editable fields:
//
//     • name
//     • code
//     • mass
//     • dateOfBirth
//
// Authorization is handled by the controller.
//
// There is NO dairy-farm assignment requirement.
//
// ==========================================================

exports.updateProfile = async (
    id,
    data = {}
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (!id) {

        const error =
            new Error(
                "Dairy profile ID is required."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE MONGODB OBJECT ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            id
        )
    ) {

        const error =
            new Error(
                "Invalid dairy profile ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // ENSURE REQUEST DATA IS AN OBJECT
    // ======================================================

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {

        const error =
            new Error(
                "Invalid profile update data."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // BUILD UPDATE OBJECT
    // ======================================================

    const updateData = {};


    // ======================================================
    // NAME
    // ======================================================

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "name"
        )
    ) {

        updateData.name =
            typeof data.name === "string"
                ? data.name.trim()
                : data.name;

    }


    // ======================================================
    // CODE
    // ======================================================

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "code"
        )
    ) {

        updateData.code =
            typeof data.code === "string"
                ? data.code.trim()
                : data.code;

    }


    // ======================================================
    // MASS
    // ======================================================

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "mass"
        )
    ) {

        updateData.mass =
            data.mass;

    }


    // ======================================================
    // DATE OF BIRTH
    // ======================================================

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "dateOfBirth"
        )
    ) {

        updateData.dateOfBirth =
            data.dateOfBirth || null;

    }


    // ======================================================
    // NOTHING TO UPDATE
    // ======================================================

    if (
        Object.keys(
            updateData
        ).length === 0
    ) {

        const error =
            new Error(
                "No editable profile information was provided."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // UPDATE DATABASE
    // ======================================================

    const updated =
        await Dairy.findByIdAndUpdate(

            id,

            {
                $set:
                    updateData
            },

            {

                new:
                    true,

                runValidators:
                    true

            }

        );


    // ======================================================
    // NOT FOUND
    // ======================================================

    if (!updated) {

        const error =
            new Error(
                "Dairy profile not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // RETURN UPDATED PROFILE
    // ======================================================

    return updated;

};