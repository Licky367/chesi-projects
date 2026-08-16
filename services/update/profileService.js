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
//     • Up to 5 profile images
//     • Multiple profile images
//     • First image becomes the primary/display image
//     • Existing `profileImage` remains supported
//
// Expected input:
//
//     {
//         dairyId,
//         userId,
//         images: [
//             "image-1.jpg",
//             "image-2.jpg"
//         ]
//     }
//
// ==========================================================

exports.updateImage = async ({

    dairyId,

    userId,

    images = []

}) => {

    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy profile not found."
        );

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
                        String(image)
                )

            : [];


    // ======================================================
    // VALIDATE
    // ======================================================

    if (
        normalizedImages.length === 0
    ) {

        throw new Error(
            "At least one profile image is required."
        );

    }


    if (
        normalizedImages.length > 5
    ) {

        throw new Error(
            "A dairy profile can have at most 5 images."
        );

    }


    // ======================================================
    // PRIMARY IMAGE
    // ======================================================
    //
    // The first image is the image displayed directly
    // on the profile card.
    //
    // ======================================================

    const primaryImage =
        normalizedImages[0];


    // ======================================================
    // SAVE PROFILE IMAGES
    // ======================================================
    //
    // `profileImages` is the new gallery field.
    //
    // `profileImage` remains populated for backwards
    // compatibility with existing code.
    //
    // ======================================================

    dairy.profileImages =
        normalizedImages;


    dairy.profileImage =
        primaryImage;


    await dairy.save();


    // ======================================================
    // CREATE FEED UPDATE
    // ======================================================
    //
    // Keep an image update in the feed.
    //
    // The Update model currently has a legacy single
    // `image` field, so use the primary image there.
    //
    // ======================================================

    const update =
        await Update.create({

            dairy:
                dairyId,

            user:
                userId,

            userName:
                "System",

            type:
                "image",

            image:
                primaryImage

        });


    // ======================================================
    // RETURN UPDATED INFORMATION
    // ======================================================
    //
    // Returning the Dairy document allows the controller
    // to use the saved profileImages if needed.
    //
    // ======================================================

    return {

        update,

        dairy,

        profileImages:
            normalizedImages,

        profileImage:
            primaryImage

    };

};



// ==========================================================
// 🗑 DELETE DAIRY PROFILE
// ==========================================================

exports.deleteProfile = async (
    dairyId
) => {

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
    // DELETE DAIRY
    // ======================================================

    await Dairy.findByIdAndDelete(
        dairyId
    );


    return true;

};



// ==========================================================
// 📝 UPDATE PROFILE INFO
// ==========================================================

exports.updateProfile = async (
    id,
    data
) => {

    // ======================================================
    // UPDATE ONLY ALLOWED PROFILE FIELDS
    // ======================================================

    return await Dairy.findByIdAndUpdate(

        id,

        {

            name:
                data.name,

            code:
                data.code,

            mass:
                data.mass,

            dateOfBirth:
                data.dateOfBirth

        },

        {

            new:
                true,

            runValidators:
                true

        }

    );

};