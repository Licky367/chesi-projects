// ==========================================================
// controllers/update/profileController.js
// ==========================================================
//
// DAIRY PROFILE CONTROLLER
//
// Responsibilities:
//
// • Update Dairy profile images
// • Set the MAIN profile image
// • Update Dairy profile information
// • Delete Dairy profile
//
// PROFILE IMAGE DESIGN
// ----------------------------------------------------------
//
// A Dairy profile has:
//
//     profileImages
//         → Array containing up to 5 image URLs
//
//     profileImage
//         → The selected MAIN image
//
// Example:
//
//     profileImages: [
//         "/uploads/photo1.jpg",
//         "/uploads/photo2.jpg",
//         "/uploads/photo3.jpg"
//     ]
//
//     profileImage:
//         "/uploads/photo2.jpg"
//
// The MAIN image must always be one of the images contained
// in profileImages.
//
// ==========================================================

const updateService =
    require("../../services/update");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPER
// ==========================================================
//
// Convert an uploaded Multer file into a value that can be
// stored by the update service.
//
// ==========================================================

function getUploadedImageValue(file) {

    if (!file) {

        return null;

    }


    return (
        file.filename ||
        file.path ||
        file.location ||
        null
    );

}


// ==========================================================
// HELPER
// ==========================================================
//
// Convert a stored image value into a public URL.
//
// ==========================================================

function toPublicImageUrl(image) {

    if (!image) {

        return null;

    }


    const value =
        String(image);


    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("/uploads/")
    ) {

        return value;

    }


    return `/uploads/${value}`;

}


// ==========================================================
// UPDATE PROFILE IMAGES
// ==========================================================
//
// ROUTE:
//
//     PUT /dairy/:id/image
//
// ROUTER:
//
//     upload.array("profileImages", 5)
//
// Therefore:
//
//     req.files
//
// contains the uploaded photos.
//
// The frontend should also send:
//
//     profileImageIndex
//
// Example:
//
//     profileImageIndex = 2
//
// This means:
//
//     profileImages[2]
//
// becomes:
//
//     profileImage
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
        // FIND DAIRY
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
        // COLLECT FILES
        // ==================================================
        //
        // The router uses:
        //
        //     upload.array("profileImages", 5)
        //
        // Therefore req.files is the expected source.
        //
        // req.file is retained as backwards compatibility,
        // but it is not the normal flow.
        //
        // ==================================================

        let files = [];


        if (
            Array.isArray(req.files)
        ) {

            files =
                req.files.filter(Boolean);

        }


        if (
            req.file
        ) {

            files.push(
                req.file
            );

        }


        // --------------------------------------------------
        // Remove duplicate file objects.
        // --------------------------------------------------

        files =
            [...new Set(files)];


        // ==================================================
        // REQUIRE AT LEAST ONE IMAGE
        // ==================================================

        if (
            files.length === 0
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Please select at least one profile photo."

                });

        }


        // ==================================================
        // MAXIMUM FIVE
        // ==================================================

        if (
            files.length > 5
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "You can select a maximum of 5 profile photos."

                });

        }


        // ==================================================
        // CONVERT FILES TO IMAGE VALUES
        // ==================================================

        const images =
            files
                .map(
                    getUploadedImageValue
                )
                .filter(Boolean);


        // ==================================================
        // VALIDATE IMAGE VALUES
        // ==================================================

        if (
            images.length === 0
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "The selected profile photos could not be processed."

                });

        }


        // ==================================================
        // MAIN IMAGE INDEX
        // ==================================================
        //
        // The browser sends:
        //
        //     profileImageIndex
        //
        // Example:
        //
        //     "0"
        //
        //     "1"
        //
        //     "2"
        //
        // etc.
        //
        // If no index is supplied, the first image becomes
        // the main image.
        //
        // ==================================================

        let profileImageIndex =
            Number(
                req.body?.profileImageIndex
            );


        if (
            !Number.isInteger(
                profileImageIndex
            )
        ) {

            profileImageIndex = 0;

        }


        // ==================================================
        // VALIDATE MAIN IMAGE INDEX
        // ==================================================

        if (
            profileImageIndex < 0 ||
            profileImageIndex >= images.length
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "The selected main profile photo is invalid."

                });

        }


        // ==================================================
        // DETERMINE MAIN IMAGE
        // ==================================================

        const profileImage =
            images[
                profileImageIndex
            ];


        // ==================================================
        // UPDATE PROFILE
        // ==================================================
        //
        // IMPORTANT:
        //
        // The service receives BOTH:
        //
        //     images
        //
        // and:
        //
        //     profileImage
        //
        // so the service can save:
        //
        //     profileImages = images
        //
        //     profileImage  = selected image
        //
        // ==================================================

        const updated =
            await updateService.updateImage({

                dairyId:
                    id,

                userId:
                    user._id,

                images,

                profileImages:
                    images,

                profileImage,

                isAdmin:
                    true

            });


        // ==================================================
        // DETERMINE SAVED PROFILE IMAGES
        // ==================================================
        //
        // Prefer the values returned by the service.
        //
        // ==================================================

        const savedProfileImages =
            Array.isArray(
                updated?.profileImages
            )
                ? updated.profileImages
                : images;


        // ==================================================
        // DETERMINE SAVED MAIN IMAGE
        // ==================================================

        const savedProfileImage =
            updated?.profileImage ||
            profileImage ||
            savedProfileImages[0] ||
            null;


        // ==================================================
        // PUBLIC URLS
        // ==================================================

        const imageUrls =
            savedProfileImages
                .filter(Boolean)
                .map(
                    toPublicImageUrl
                );


        const primaryImage =
            toPublicImageUrl(
                savedProfileImage
            );


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

            profileImage:
                primaryImage,

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
                updated?.updatedAt
                    ? new Date(
                        updated.updatedAt
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


            io.to(id).emit(
                "imageUpdated",
                payload
            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            message:
                "Profile photos updated successfully.",

            dairyId:
                id,

            profileImages:
                imageUrls,

            profileImage:
                primaryImage,

            // ------------------------------------------------
            // Compatibility fields
            // ------------------------------------------------

            images:
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
        // KNOWN HTTP ERRORS
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
        // INVALID REQUEST
        // ==================================================

        if (
            err.status === 400 ||
            err.statusCode === 400
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        err.message ||
                        "Invalid profile image request."

                });

        }


        // ==================================================
        // SERVER ERROR
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
// UPDATE PROFILE INFORMATION
// ==========================================================
//
// ROUTE:
//
//     PUT /dairy/:id/update
//
// Updates:
//
//     • name
//     • mass
//     • dateOfBirth
//
// Code remains unchanged.
//
// There is NO dairy-farm assignment requirement.
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

            message:
                "Dairy profile updated successfully.",

            profile:
                updated || null

        });

    } catch (err) {

        console.error(
            "UPDATE PROFILE ERROR:",
            err
        );


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
                        "You are not authorized to edit this dairy profile."

                });

        }


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


        return res
            .status(500)
            .json({

                success: false,

                message:
                    err.message ||
                    "Failed to update dairy profile."

            });

    }

};



// ==========================================================
// DELETE DAIRY PROFILE
// ==========================================================
//
// ROUTE:
//
//     DELETE /dairy/:id
//
// Only admin can delete a Dairy profile.
//
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
                        "You are not authorized to delete this dairy profile."

                });

        }


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