// ==========================================================
// services/update/profileService.js
// ==========================================================

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
//     • First image becomes primary/display image
//     • Existing `profileImage` remains supported
//
// IMPORTANT:
//
// This service DOES NOT require the dairy asset to be
// assigned to a dairy farm.
//
// Assignment to a dairy farm is NOT relevant to updating
// or viewing the profile.
//
// The controller is responsible for authentication and
// authorization.
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
    // PRIMARY IMAGE
    // ======================================================
    //
    // The first uploaded image is always the primary
    // profile image.
    //
    // ======================================================

    const primaryImage =
        normalizedImages[0];


    // ======================================================
    // SAVE PROFILE IMAGES
    // ======================================================

    dairy.profileImages =
        normalizedImages;


    // ======================================================
    // BACKWARDS COMPATIBILITY
    // ======================================================
    //
    // Existing parts of the application may still use
    // `profileImage`.
    //
    // Keep it synchronized with the first image.
    //
    // ======================================================

    dairy.profileImage =
        primaryImage;


    // ======================================================
    // OPTIONAL displayImage SUPPORT
    // ======================================================
    //
    // Only update this field if the Dairy schema actually
    // contains it.
    //
    // ======================================================

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : dairy;


    if (
        Object.prototype.hasOwnProperty.call(
            dairyObject,
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
    // The Update model currently uses a single `image`
    // field.
    //
    // Therefore the primary image is stored there.
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
    // RETURN UPDATED INFORMATION
    // ======================================================

    return {

        update,

        dairy,

        profileImages:
            normalizedImages,

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
//     • Feed updates belonging to the dairy
//     • Milk records belonging to the dairy
//     • Dairy profile itself
//
// Authorization is handled by the controller.
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
// Updates:
//
//     • name
//     • code
//     • mass
//     • dateOfBirth
//
// Authorization is handled by the controller.
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
    // BUILD UPDATE OBJECT
    // ======================================================

    const updateData = {};


    // ------------------------------------------------------
    // NAME
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "name"
        )
    ) {

        updateData.name =
            data.name;

    }


    // ------------------------------------------------------
    // CODE
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "code"
        )
    ) {

        updateData.code =
            data.code;

    }


    // ------------------------------------------------------
    // MASS
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "mass"
        )
    ) {

        updateData.mass =
            data.mass;

    }


    // ------------------------------------------------------
    // DATE OF BIRTH
    // ------------------------------------------------------

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
    // RETURN
    // ======================================================

    return updated;

};