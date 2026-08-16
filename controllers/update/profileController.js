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


        // ==================================================
        // REMOVE DUPLICATES
        // ==================================================

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
// 🥛 TOGGLE MILKING STATUS
// ==========================================================
//
// URL:
//
//     POST /dairy/:id/toggle-milking
//
// Purpose:
//
//     Toggle the `isMilking` field of the Dairy document.
//
//     false → true
//     true  → false
//
// AUTHORIZED USERS:
//
//     • admin
//     • dairyWorker
//
// IMPORTANT:
//
// There is NO dairy-farm assignment check.
//
// The Dairy document is identified directly using:
//
//     req.params.id
//
// ==========================================================

exports.toggleMilking = async (req, res) => {

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
        // ROLE CHECK
        // ==================================================
        //
        // Both admin and dairyWorker can toggle
        // milking status.
        //
        // ==================================================

        const canToggleMilking =
            user.role === "admin" ||
            user.role === "dairyWorker";


        if (!canToggleMilking) {

            return res
                .status(403)
                .json({

                    success: false,

                    message:
                        "Only admin or dairyWorker can change milking status."

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
        // TOGGLE STATUS
        // ==================================================

        dairy.isMilking =
            !Boolean(
                dairy.isMilking
            );


        // ==================================================
        // SAVE
        // ==================================================

        await dairy.save();


        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(id).emit(

                "milkingStatusUpdated",

                {

                    dairyId:
                        id,

                    isMilking:
                        dairy.isMilking

                }

            );

        }


        // ==================================================
        // RESPONSE
        // ==================================================
        //
        // If JavaScript/fetch requested JSON,
        // return JSON.
        //
        // Otherwise redirect back to the dairy profile.
        //
        // ==================================================

        const wantsJson =
            req.xhr ||
            (
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                )
            );


        if (wantsJson) {

            return res.json({

                success:
                    true,

                message:
                    dairy.isMilking
                        ? "Animal marked as milking."
                        : "Animal marked as not milking.",

                dairyId:
                    id,

                isMilking:
                    dairy.isMilking

            });

        }


        // ==================================================
        // NORMAL LINK REQUEST
        // ==================================================

        return res.redirect(
            `/dairy/${id}`
        );


    } catch (err) {

        console.error(
            "TOGGLE MILKING ERROR:",
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
                        "Only admin or dairyWorker can change milking status."

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
                    "Failed to change milking status."

            });

    }

};



// ==========================================================
// 🗑 DELETE DAIRY PROFILE
// ==========================================================

exports.deleteProfile = async (req, res) => {

    try {

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


        await updateService.deleteProfile(
            id
        );


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


        const updated =
            await updateService.updateProfile(

                id,

                req.body

            );


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
                    "Failed to update profile."

            });

    }

};