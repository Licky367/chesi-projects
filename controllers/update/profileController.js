// ==========================================================
// controllers/update/profileController.js
// ==========================================================

const updateService =
    require("../../services/update");


// ==========================================================
// 🟦 UPDATE PROFILE IMAGES
// ==========================================================
//
// Supports:
//
//     • Up to 5 profile images
//     • Multiple uploads
//     • First image can be used as the primary/display image
//     • Images are returned to the frontend as an array
//
// Expected multer configuration:
//
//     upload.array("profileImages", 5)
//
// Therefore:
//
//     req.files
//
// is used instead of:
//
//     req.file
//
// ==========================================================

exports.image = async (req, res) => {

    try {

        // ==================================================
        // PROFILE ID
        // ==================================================

        const {
            id
        } = req.params;


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .send("Unauthorized");

        }


        // ==================================================
        // ADMIN CHECK
        // ==================================================
        //
        // Profile editing is currently an admin operation.
        //
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only admin can update dairy profile images"
                );

        }


        // ==================================================
        // FILES
        // ==================================================

        const files =
            Array.isArray(req.files)
                ? req.files
                : [];


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            files.length === 0
        ) {

            return res
                .status(400)
                .send(
                    "No profile image uploaded"
                );

        }


        // ==================================================
        // MAXIMUM IMAGE COUNT
        // ==================================================
        //
        // The profile may contain at most 5 images.
        //
        // ==================================================

        if (
            files.length > 5
        ) {

            return res
                .status(400)
                .send(
                    "A dairy profile can have at most 5 images."
                );

        }


        // ==================================================
        // NORMALIZE FILENAMES
        // ==================================================

        const images =
            files
                .map(
                    file =>
                        file &&
                        file.filename
                )
                .filter(Boolean);


        if (
            images.length === 0
        ) {

            return res
                .status(400)
                .send(
                    "No valid profile images uploaded"
                );

        }


        // ==================================================
        // UPDATE PROFILE
        // ==================================================
        //
        // updateService.updateImage() should save:
        //
        //     profileImages: images
        //
        // The first image is also treated as the primary
        // profile/display image.
        //
        // ==================================================

        const update =
            await updateService.updateImage({

                dairyId:
                    id,

                userId:
                    user._id,

                images

            });


        // ==================================================
        // RESPONSE IMAGES
        // ==================================================
        //
        // Prefer the images returned by the service/model.
        //
        // If the service does not return them, use the
        // uploaded images.
        //
        // ==================================================

        const profileImages =
            Array.isArray(
                update &&
                update.profileImages
            )
                ? update.profileImages
                : images;


        // ==================================================
        // CONVERT TO PUBLIC UPLOAD PATHS
        // ==================================================

        const imageUrls =
            profileImages
                .filter(Boolean)
                .map(
                    image => {

                        const value =
                            String(image);

                        return value.startsWith(
                            "/uploads/"
                        )
                            ? value
                            : `/uploads/${value}`;

                    }
                );


        // ==================================================
        // PRIMARY IMAGE
        // ==================================================
        //
        // The first image is the display image.
        //
        // ==================================================

        const primaryImage =
            imageUrls.length > 0
                ? imageUrls[0]
                : null;


        // ==================================================
        // SOCKET PAYLOAD
        // ==================================================

        const payload = {

            dairyId:
                id,

            // ----------------------------------------------
            // All profile images
            // ----------------------------------------------

            images:
                imageUrls,

            profileImages:
                imageUrls,

            // ----------------------------------------------
            // Primary/display image
            // ----------------------------------------------

            image:
                primaryImage,

            displayImage:
                primaryImage,

            // ----------------------------------------------
            // User information
            // ----------------------------------------------

            userName:
                user.name,

            userImage:
                user.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name
                )}`,

            // ----------------------------------------------
            // Date
            // ----------------------------------------------

            dateText:
                update &&
                update.createdAt
                    ? new Date(
                        update.createdAt
                    ).toLocaleString()
                    : new Date().toLocaleString()

        };


        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(id).emit(
                "profileImagesUpdated",
                payload
            );

            // ----------------------------------------------
            // Backwards compatibility
            // ----------------------------------------------
            //
            // Existing frontend code listening for
            // imageUpdated can still receive the primary
            // image.
            //
            // ----------------------------------------------

            io.to(id).emit(
                "imageUpdated",
                payload
            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================
        //
        // If this request came from normal form submission,
        // redirect as before.
        //
        // ==================================================

        return res.redirect(
            `/dairy/${id}`
        );


    } catch (err) {

        console.error(
            "PROFILE IMAGES UPDATE ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to update profile images"
            );

    }

};



// ==========================================================
// 🗑 DELETE DAIRY PROFILE
// ==========================================================

exports.deleteProfile = async (req, res) => {

    try {

        // ==================================================
        // PARAMETERS
        // ==================================================

        const {
            id
        } = req.params;


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .send("Unauthorized");

        }


        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only admin can delete dairy profiles"
                );

        }


        // ==================================================
        // DELETE
        // ==================================================

        await updateService.deleteProfile(
            id
        );


        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.emit(
                "dairyDeleted",
                {

                    dairyId:
                        id

                }
            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            message:
                "Dairy profile deleted successfully."

        });


    } catch (err) {

        console.error(
            "DELETE PROFILE ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Failed to delete dairy profile"

            });

    }

};



// ==========================================================
// 📝 UPDATE PROFILE INFORMATION
// ==========================================================
//
// Updates:
//
//     name
//     code
//     dateOfBirth
//     mass
//
// Other profile fields can continue to be handled by the
// service.
//
// ==========================================================

exports.updateProfile = async (req, res) => {

    try {

        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    message:
                        "Unauthorized"

                });

        }


        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    message:
                        "Only admin can edit dairy profiles."

                });

        }


        // ==================================================
        // UPDATE
        // ==================================================

        const updated =
            await updateService.updateProfile(

                req.params.id,

                req.body

            );


        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(
                req.params.id
            ).emit(

                "profileUpdated",

                {

                    dairyId:
                        req.params.id,

                    profile:
                        updated

                }

            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            profile:
                updated || null

        });


    } catch (err) {

        console.error(
            "UPDATE PROFILE ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Failed to update profile."

            });

    }

};