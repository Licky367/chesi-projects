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
//     • Up to 5 profile images
//     • Multiple profile images
//     • First image becomes primary/display image
//     • Existing `profileImage` remains supported
//     • Normal users may still be checked against
//       their assigned dairy farm
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
// IMPORTANT:
//
// Admins are NOT required to be assigned to the dairy farm.
//
// Normal users continue to require assignment.
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

        throw new Error(
            "Dairy profile ID is required."
        );

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
    // NORMALIZE ADMIN FLAG
    // ======================================================

    const admin =
        isAdmin === true;


    // ======================================================
    // NORMAL USER AUTHORIZATION
    // ======================================================
    //
    // Admin:
    //
    //     Can update any dairy profile.
    //
    // Normal user:
    //
    //     Must be assigned to the dairy farm.
    //
    // The exact assignment fields in the Dairy model can
    // vary, so this section checks the common assignment
    // relationships without applying the restriction to
    // administrators.
    //
    // ======================================================

    if (!admin) {

        if (!userId) {

            const error =
                new Error(
                    "User identification is required."
                );

            error.status = 401;

            throw error;

        }


        // ==================================================
        // USER
        // ==================================================

        const User =
            require("../../models/User");


        const user =
            await User.findById(
                userId
            );


        if (!user) {

            const error =
                new Error(
                    "User not found."
                );

            error.status = 401;

            throw error;

        }


        // ==================================================
        // ASSIGNMENT CHECK
        // ==================================================
        //
        // Check the dairy's assigned user/worker fields.
        //
        // This is deliberately NOT executed for admins.
        //
        // ==================================================

        const dairyObject =
            dairy.toObject
                ? dairy.toObject()
                : dairy;


        const assignedUserIds = [];


        // --------------------------------------------------
        // Direct user assignment
        // --------------------------------------------------

        if (
            dairyObject.user
        ) {

            assignedUserIds.push(
                String(
                    dairyObject.user
                )
            );

        }


        if (
            dairyObject.userId
        ) {

            assignedUserIds.push(
                String(
                    dairyObject.userId
                )
            );

        }


        if (
            dairyObject.assignedUser
        ) {

            assignedUserIds.push(
                String(
                    dairyObject.assignedUser
                )
            );

        }


        if (
            dairyObject.assignedUserId
        ) {

            assignedUserIds.push(
                String(
                    dairyObject.assignedUserId
                )
            );

        }


        // --------------------------------------------------
        // Assigned users array
        // --------------------------------------------------

        if (
            Array.isArray(
                dairyObject.assignedUsers
            )
        ) {

            dairyObject.assignedUsers.forEach(
                assigned => {

                    if (!assigned) {

                        return;

                    }


                    if (
                        typeof assigned === "object" &&
                        assigned._id
                    ) {

                        assignedUserIds.push(
                            String(
                                assigned._id
                            )
                        );

                    } else {

                        assignedUserIds.push(
                            String(
                                assigned
                            )
                        );

                    }

                }
            );

        }


        // --------------------------------------------------
        // Workers array
        // --------------------------------------------------

        if (
            Array.isArray(
                dairyObject.workers
            )
        ) {

            dairyObject.workers.forEach(
                worker => {

                    if (!worker) {

                        return;

                    }


                    if (
                        typeof worker === "object" &&
                        worker._id
                    ) {

                        assignedUserIds.push(
                            String(
                                worker._id
                            )
                        );

                    } else {

                        assignedUserIds.push(
                            String(
                                worker
                            )
                        );

                    }

                }
            );

        }


        // --------------------------------------------------
        // Farm assignment
        // --------------------------------------------------
        //
        // Some dairy records use a farm-level assignment
        // rather than assigning every animal directly.
        //
        // If the user has assigned dairy farms, check whether
        // this animal belongs to one of them.
        //
        // --------------------------------------------------

        let assignedToDairy =
            assignedUserIds.includes(
                String(userId)
            );


        // --------------------------------------------------
        // Check user's assigned dairy farms
        // --------------------------------------------------

        if (!assignedToDairy) {

            const userObject =
                user.toObject
                    ? user.toObject()
                    : user;


            const assignedFarmIds = [];


            if (
                Array.isArray(
                    userObject.dairyFarms
                )
            ) {

                userObject.dairyFarms.forEach(
                    farm => {

                        if (!farm) {

                            return;

                        }


                        if (
                            typeof farm === "object" &&
                            farm._id
                        ) {

                            assignedFarmIds.push(
                                String(
                                    farm._id
                                )
                            );

                        } else {

                            assignedFarmIds.push(
                                String(farm)
                            );

                        }

                    }
                );

            }


            if (
                Array.isArray(
                    userObject.assignedDairyFarms
                )
            ) {

                userObject.assignedDairyFarms.forEach(
                    farm => {

                        if (!farm) {

                            return;

                        }


                        if (
                            typeof farm === "object" &&
                            farm._id
                        ) {

                            assignedFarmIds.push(
                                String(
                                    farm._id
                                )
                            );

                        } else {

                            assignedFarmIds.push(
                                String(farm)
                            );

                        }

                    }
                );

            }


            if (
                userObject.assignedDairies
            ) {

                const assignedDairies =
                    Array.isArray(
                        userObject.assignedDairies
                    )
                        ? userObject.assignedDairies
                        : [
                            userObject.assignedDairies
                        ];


                assignedDairies.forEach(
                    farm => {

                        if (!farm) {

                            return;

                        }


                        if (
                            typeof farm === "object" &&
                            farm._id
                        ) {

                            assignedFarmIds.push(
                                String(
                                    farm._id
                                )
                            );

                        } else {

                            assignedFarmIds.push(
                                String(farm)
                            );

                        }

                    }
                );

            }


            // ------------------------------------------------
            // Direct farm reference on asset
            // ------------------------------------------------

            const farmId =
                dairyObject.farm ||
                dairyObject.farmId ||
                dairyObject.dairyFarm ||
                dairyObject.dairyFarmId ||
                dairyObject.parentDairy;


            if (farmId) {

                assignedToDairy =
                    assignedFarmIds.includes(
                        String(
                            farmId._id ||
                            farmId
                        )
                    );

            }

        }


        // ==================================================
        // FINAL NORMAL USER CHECK
        // ==================================================

        if (!assignedToDairy) {

            const error =
                new Error(
                    "You are not assigned to this dairy farm."
                );

            error.status = 403;

            throw error;

        }

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
                .filter(
                    image =>
                        image.trim().length > 0
                )

            : [];


    // ======================================================
    // VALIDATE IMAGES
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

    const primaryImage =
        normalizedImages[0];


    // ======================================================
    // SAVE PROFILE IMAGES
    // ======================================================

    dairy.profileImages =
        normalizedImages;


    // ------------------------------------------------------
    // Backwards compatibility
    // ------------------------------------------------------

    dairy.profileImage =
        primaryImage;


    // ------------------------------------------------------
    // Optional displayImage support
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            dairy.toObject(),
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
    // The Update model uses the legacy single `image`
    // field, therefore the primary image is stored there.
    //
    // For an administrator there is no assigned worker
    // relationship required.
    //
    // ======================================================

    const update =
        await Update.create({

            dairy:
                dairyId,

            user:
                userId || undefined,

            userName:
                admin
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

exports.deleteProfile = async (
    dairyId
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (!dairyId) {

        throw new Error(
            "Dairy profile ID is required."
        );

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
//
// Updates only:
//
//     • name
//     • code
//     • mass
//     • dateOfBirth
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

        throw new Error(
            "Dairy profile ID is required."
        );

    }


    // ======================================================
    // BUILD UPDATE
    // ======================================================

    const updateData = {};


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "name"
        )
    ) {

        updateData.name =
            data.name;

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "code"
        )
    ) {

        updateData.code =
            data.code;

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "mass"
        )
    ) {

        updateData.mass =
            data.mass;

    }


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
    // UPDATE
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


    return updated;

};