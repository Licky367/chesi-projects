// ==========================================================
// controllers/update/profileController.js
// ==========================================================

const updateService =
    require("../../services/update");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// 🟦 UPDATE PROFILE IMAGES
// ==========================================================
//
// Supports:
//
//     • Admin updating ANY dairy profile
//     • Up to 5 profile images
//     • req.file
//     • req.files
//     • profileImage
//     • profileImages
//
// IMPORTANT:
//
// This controller does NOT require the animal to be:
//
//     • assigned to a dairy farm
//     • assigned to a dairy worker
//     • attached to any farm
//
// A dairy animal is identified directly by its
// Dairy document ID.
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


        if (!id) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Dairy profile ID is required."

                });

        }


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized."

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

                    success: false,

                    message:
                        "Only admin can update dairy profile images."

                });

        }


        // ==================================================
        // VERIFY PROFILE EXISTS
        // ==================================================

        const dairy =
            await Dairy.findById(id);


        if (!dairy) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Dairy profile not found."

                });

        }


        // ==================================================
        // COLLECT UPLOADED FILES
        // ==================================================
        //
        // Supports:
        //
        //     upload.single("profileImage")
        //
        // and:
        //
        //     upload.array("profileImages", 5)
        //
        // ==================================================

        let files = [];


        // --------------------------------------------------
        // upload.array(...)
        // --------------------------------------------------

        if (
            Array.isArray(req.files)
        ) {

            files =
                req.files.filter(Boolean);

        }


        // --------------------------------------------------
        // upload.single(...)
        // --------------------------------------------------

        if (
            req.file
        ) {

            files.push(
                req.file
            );

        }


        // --------------------------------------------------
        // Remove duplicate references
        // --------------------------------------------------

        files =
            [...new Set(files)];


        // ==================================================
        // VALIDATE FILES
        // ==================================================

        if (
            files.length === 0
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "No profile image uploaded."

                });

        }


        // ==================================================
        // MAXIMUM IMAGE COUNT
        // ==================================================

        if (
            files.length > 5
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "A dairy profile can have at most 5 images."

                });

        }


        // ==================================================
        // NORMALIZE FILENAMES
        // ==================================================

        const images =
            files
                .map(
                    file => {

                        if (!file) {

                            return null;

                        }


                        return (
                            file.filename ||
                            file.path ||
                            null
                        );

                    }
                )
                .filter(Boolean);


        if (
            images.length === 0
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "No valid profile images uploaded."

                });

        }


        // ==================================================
        // UPDATE PROFILE
        // ==================================================
        //
        // IMPORTANT:
        //
        // There is deliberately NO farm-assignment check.
        //
        // The admin is allowed to update any Dairy document
        // that exists.
        //
        // ==================================================

        const update =
            await updateService.updateImage({

                dairyId:
                    id,

                userId:
                    user._id,

                images,

                isAdmin:
                    true

            });


        // ==================================================
        // PROFILE IMAGES
        // ==================================================

        const profileImages =
            Array.isArray(
                update &&
                update.profileImages
            )
                ? update.profileImages
                : images;


        // ==================================================
        // CONVERT TO PUBLIC URLS
        // ==================================================

        const imageUrls =
            profileImages
                .filter(Boolean)
                .map(
                    image => {

                        const value =
                            String(image);


                        if (
                            value.startsWith(
                                "/uploads/"
                            )
                        ) {

                            return value;

                        }


                        return `/uploads/${value}`;

                    }
                );


        // ==================================================
        // PRIMARY IMAGE
        // ==================================================

        const primaryImage =
            imageUrls.length
                ? imageUrls[0]
                : null;


        // ==================================================
        // SOCKET.IO PAYLOAD
        // ==================================================

        const payload = {

            dairyId:
                id,

            images:
                imageUrls,

            profileImages:
                imageUrls,

            image:
                primaryImage,

            displayImage:
                primaryImage,

            userName:
                user.name ||
                "Admin",

            userImage:
                user.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name || "Admin"
                )}`,

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


            // Backwards compatibility
            io.to(id).emit(
                "imageUpdated",
                payload
            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================
        //
        // The EJS uses fetch(), therefore JSON is returned.
        //
        // ==================================================

        return res.json({

            success:
                true,

            message:
                "Profile images updated successfully.",

            dairyId:
                id,

            images:
                imageUrls,

            profileImages:
                imageUrls,

            image:
                primaryImage,

            displayImage:
                primaryImage

        });


    } catch (err) {

        console.error(
            "PROFILE IMAGES UPDATE ERROR:",
            err
        );


        // ==================================================
        // KNOWN AUTHORIZATION ERROR
        // ==================================================

        if (
            err.status === 401 ||
            err.statusCode === 401
        ) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        err.message ||
                        "Unauthorized."

                });

        }


        // ==================================================
        // KNOWN FORBIDDEN ERROR
        // ==================================================

        if (
            err.status === 403 ||
            err.statusCode === 403
        ) {

            return res
                .status(403)
                .json({

                    success: false,

                    message:
                        err.message ||
                        "You are not authorized to update this dairy profile."

                });

        }


        // ==================================================
        // KNOWN NOT FOUND ERROR
        // ==================================================

        if (
            err.status === 404 ||
            err.statusCode === 404
        ) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        err.message ||
                        "Dairy profile not found."

                });

        }


        // ==================================================
        // GENERAL ERROR
        // ==================================================

        return res
            .status(500)
            .json({

                success: false,

                message:
                    err.message ||
                    "Failed to update profile images."

            });

    }

};



// ==========================================================
// 🗑 DELETE DAIRY PROFILE
// ==========================================================

exports.deleteProfile = async (req, res) => {

    try {

        // ==================================================
        // PROFILE ID
        // ==================================================

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Dairy profile ID is required."

                });

        }


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized."

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

                    success: false,

                    message:
                        "Only admin can delete dairy profiles."

                });

        }


        // ==================================================
        // VERIFY PROFILE
        // ==================================================

        const dairy =
            await Dairy.findById(id);


        if (!dairy) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Dairy profile not found."

                });

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

                success: false,

                message:
                    err.message ||
                    "Failed to delete dairy profile."

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
//     mass
//     dateOfBirth
//
// Code remains unchanged.
//
// There is NO farm-assignment requirement here.
//
// ==========================================================

exports.updateProfile = async (req, res) => {

    try {

        // ==================================================
        // PROFILE ID
        // ==================================================

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Dairy profile ID is required."

                });

        }


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized."

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

                    success: false,

                    message:
                        "Only admin can edit dairy profiles."

                });

        }


        // ==================================================
        // VERIFY PROFILE
        // ==================================================

        const dairy =
            await Dairy.findById(id);


        if (!dairy) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Dairy profile not found."

                });

        }


        // ==================================================
        // UPDATE
        // ==================================================

        const updated =
            await updateService.updateProfile(

                id,

                req.body

            );


        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(id).emit(

                "profileUpdated",

                {

                    dairyId:
                        id,

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


        // ==================================================
        // KNOWN NOT FOUND ERROR
        // ==================================================

        if (
            err.status === 404 ||
            err.statusCode === 404
        ) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        err.message ||
                        "Dairy profile not found."

                });

        }


        // ==================================================
        // GENERAL ERROR
        // ==================================================

        return res
            .status(500)
            .json({

                success: false,

                message:
                    err.message ||
                    "Failed to update profile."

            });

    }

};