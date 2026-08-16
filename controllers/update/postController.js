// ==========================================================
// controllers/update/postController.js
// ==========================================================
//
// PURPOSE:
//     Handles creation and management of feed posts.
//
// CREATE POST TARGET RULES:
// ----------------------------------------------------------
//
// CURRENT DAIRY HAS POSITIVE CODE:
//     The post automatically belongs to the current Dairy.
//
// CURRENT DAIRY HAS NEGATIVE CODE:
//     User must submit targetDairyId.
//
// VALID TARGET:
//     1. Animal
//            code > 0
//
//     2. Structure / Facility / Tool
//            code === null
//            code === undefined
//            code === ""
//
// INVALID TARGET:
//     code < 0
//
// Negative-code records are NEVER valid targets.
//
// The selected Dairy _id is passed to updateService.createPost()
// as dairyId.
// ==========================================================



// ==========================================================
// DEPENDENCIES
// ==========================================================

const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


const updateService =
    require("../../services/update/postService");



// ==========================================================
// CREATE POST
// ==========================================================
//
// Creates a normal feed post.
//
// Supports:
//
//     title
//     text
//     multiple images
//
// Uploaded files:
//
//     req.files
//
// TARGET:
//
//     Positive-code page:
//         current Dairy is automatically the target.
//
//     Negative-code page:
//         targetDairyId must be submitted.
//
// ==========================================================

exports.createPost =
async (req, res) => {

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
        // VALIDATE CURRENT DAIRY ID
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {

            return res
                .status(400)
                .send("Invalid Dairy ID");

        }



        // ==================================================
        // LOAD CURRENT DAIRY
        // ==================================================
        //
        // We always determine the current Dairy from the
        // database.
        //
        // We do NOT trust the browser to tell us whether
        // this is an animal or a general farm/facility page.
        //
        // ==================================================

        const currentDairy =
            await Dairy
                .findById(id)
                .select("_id name code");


        if (!currentDairy) {

            return res
                .status(404)
                .send("Dairy not found");

        }



        // ==================================================
        // DETERMINE CURRENT DAIRY CODE
        // ==================================================

        const currentCode =
            currentDairy.code;



        // ==================================================
        // DETERMINE WHETHER CURRENT PAGE IS NEGATIVE-CODE
        // ==================================================
        //
        // IMPORTANT:
        //
        // Only a NEGATIVE numeric code activates the
        // target-selection requirement.
        //
        // Positive code:
        //     normal animal page
        //
        // Negative code:
        //     general farm / facility / structure / tool
        //
        // No-code records are NOT treated as negative-code
        // pages.
        //
        // ==================================================

        const currentHasNegativeCode =
            currentCode !== null &&
            currentCode !== undefined &&
            currentCode !== "" &&
            Number.isFinite(
                Number(currentCode)
            ) &&
            Number(currentCode) < 0;



        // ==================================================
        // DEFAULT TARGET
        // ==================================================
        //
        // If the current Dairy has a positive code, the post
        // automatically belongs to this Dairy.
        //
        // ==================================================

        let targetDairyId =
            currentDairy._id;



        // ==================================================
        // NEGATIVE-CODE PAGE
        // ==================================================
        //
        // A negative-code page requires the user to select
        // what the post is actually about.
        //
        // ==================================================

        if (
            currentHasNegativeCode
        ) {

            // ----------------------------------------------
            // READ SUBMITTED TARGET
            // ----------------------------------------------

            const submittedTargetId =
                typeof req.body.targetDairyId === "string"
                    ? req.body.targetDairyId.trim()
                    : "";



            // ----------------------------------------------
            // TARGET REQUIRED
            // ----------------------------------------------

            if (!submittedTargetId) {

                return res
                    .status(400)
                    .send(
                        "Please select what this update is about"
                    );

            }



            // ----------------------------------------------
            // TARGET OBJECT ID
            // ----------------------------------------------

            if (
                !mongoose.Types.ObjectId.isValid(
                    submittedTargetId
                )
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target"
                    );

            }



            // ==================================================
            // LOAD SELECTED TARGET
            // ==================================================

            const selectedDairy =
                await Dairy
                    .findById(
                        submittedTargetId
                    )
                    .select("_id name code");


            if (!selectedDairy) {

                return res
                    .status(404)
                    .send(
                        "Selected post target not found"
                    );

            }



            // ==================================================
            // NEVER ALLOW CURRENT NEGATIVE-CODE RECORD
            // ==================================================
            //
            // A negative-code Dairy represents a general
            // farm/facility/structure/tool context.
            //
            // It cannot itself become the target of this post.
            //
            // ==================================================

            const selectedCode =
                selectedDairy.code;



            const selectedHasNegativeCode =
                selectedCode !== null &&
                selectedCode !== undefined &&
                selectedCode !== "" &&
                Number.isFinite(
                    Number(selectedCode)
                ) &&
                Number(selectedCode) < 0;


            if (
                selectedHasNegativeCode
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target"
                    );

            }



            // ==================================================
            // VALID TARGET TYPES
            // ==================================================
            //
            // TYPE 1:
            //
            // Animal
            //
            //     code > 0
            //
            //
            // TYPE 2:
            //
            // Structure / Facility / Tool
            //
            //     NO CODE
            //
            //     null
            //     undefined
            //     ""
            //
            // ==================================================

            const isAnimal =
                selectedCode !== null &&
                selectedCode !== undefined &&
                selectedCode !== "" &&
                Number.isFinite(
                    Number(selectedCode)
                ) &&
                Number(selectedCode) > 0;



            const isStructureFacilityTool =
                selectedCode === null ||
                selectedCode === undefined ||
                selectedCode === "";



            // ==================================================
            // FINAL TARGET VALIDATION
            // ==================================================

            if (
                !isAnimal &&
                !isStructureFacilityTool
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target"
                    );

            }



            // ==================================================
            // ACCEPT SELECTED TARGET
            // ==================================================

            targetDairyId =
                selectedDairy._id;

        }



        // ==================================================
        // POST DATA
        // ==================================================

        const title =
            typeof req.body.title === "string"
                ? req.body.title.trim()
                : "";


        const text =
            typeof req.body.text === "string"
                ? req.body.text.trim()
                : "";



        // ==================================================
        // MULTIPLE IMAGES
        // ==================================================

        const files =
            Array.isArray(req.files)
                ? req.files
                : [];


        const images =
            files
                .map(
                    file =>
                        file &&
                        file.filename
                )
                .filter(Boolean);



        // ==================================================
        // POST CONTENT VALIDATION
        // ==================================================
        //
        // At least one of the following must exist:
        //
        //     title
        //     text
        //     image
        //
        // ==================================================

        if (
            !title &&
            !text &&
            images.length === 0
        ) {

            return res
                .status(400)
                .send(
                    "Post title, text or image required"
                );

        }



        // ==================================================
        // CREATE POST
        // ==================================================
        //
        // IMPORTANT:
        //
        // We save targetDairyId as dairyId.
        //
        // Therefore:
        //
        // Positive-code page:
        //     dairy = current Dairy
        //
        // Negative-code page:
        //     dairy = selected target
        //
        // ==================================================

        const post =
            await updateService.createPost({

                dairyId:
                    targetDairyId,

                userId:
                    user._id,

                userName:
                    user.name,

                userImage:
                    user.profileImage || "",

                title,

                text,

                images

            });



        // ==================================================
        // RESOLVE USER IMAGE
        // ==================================================

        const userImage =
            user.profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name || "User"
            )}`;



        // ==================================================
        // SOCKET PAYLOAD
        // ==================================================

        const payload = {

            _id:
                post._id,

            dairyId:
                post.dairy,

            userId:
                user._id,

            userName:
                user.name,

            userImage,

            type:
                post.type,

            title:
                post.title || "",

            text:
                post.text || "",

            images:
                Array.isArray(post.images)
                    ? post.images
                    : [],

            // ----------------------------------------------
            // Backwards compatibility
            // ----------------------------------------------

            image:
                post.image || null,

            likes:
                Array.isArray(post.likes)
                    ? post.likes.length
                    : 0,

            comments:
                Array.isArray(post.comments)
                    ? post.comments
                    : [],

            createdAt:
                post.createdAt,

            dateText:
                post.createdAt
                    ? new Date(
                        post.createdAt
                    ).toLocaleString()
                    : ""

        };



        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            // ----------------------------------------------
            // TARGET DAIRY ROOM
            // ----------------------------------------------
            //
            // Users viewing the actual target should receive
            // the new post.
            //
            // ----------------------------------------------

            io.to(
                String(targetDairyId)
            ).emit(
                "postCreated",
                payload
            );



            // ----------------------------------------------
            // ORIGINATING PAGE ROOM
            // ----------------------------------------------
            //
            // If the post was created from a negative-code
            // general page and targeted another Dairy, also
            // notify the page where the post was created.
            //
            // ----------------------------------------------

            if (
                String(targetDairyId) !==
                String(id)
            ) {

                io.to(
                    String(id)
                ).emit(
                    "postCreated",
                    payload
                );

            }

        }



        // ==================================================
        // REDIRECT
        // ==================================================
        //
        // Keep the user on the page from which the post was
        // created.
        //
        // ==================================================

        return res.redirect(
            `/dairy/${id}`
        );


    } catch (err) {

        console.error(
            "CREATE POST ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to create post"
            );

    }

};



// ==========================================================
// LIKE / UNLIKE POST
// ==========================================================

exports.likePost =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized"

                });

        }



        // ==================================================
        // TOGGLE LIKE
        // ==================================================

        const result =
            await updateService.toggleLike({

                postId:
                    id,

                userId:
                    user._id

            });



        // ==================================================
        // DAIRY ROOM
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";



        // ==================================================
        // SOCKET
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(
                String(dairyId)
            ).emit(

                "postLiked",

                {

                    postId:
                        id,

                    likes:
                        result.likes,

                    liked:
                        result.liked

                }

            );

        }



        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            liked:
                result.liked,

            likes:
                result.likes

        });


    } catch (err) {

        console.error(
            "LIKE POST ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    err.message ||
                    "Failed to like post"

            });

    }

};



// ==========================================================
// ADD COMMENT TO POST
// ==========================================================

exports.addPostComment =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized"

                });

        }



        // ==================================================
        // COMMENT TEXT
        // ==================================================

        const text =
            typeof req.body.text === "string"
                ? req.body.text.trim()
                : "";


        if (!text) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Comment text required"

                });

        }



        // ==================================================
        // ADD COMMENT
        // ==================================================

        const comment =
            await updateService.addPostComment({

                postId:
                    id,

                userId:
                    user._id,

                userName:
                    user.name,

                userImage:
                    user.profileImage || "",

                text

            });



        // ==================================================
        // COMMENT PAYLOAD
        // ==================================================

        const payload = {

            success:
                true,

            postId:
                id,

            comment: {

                _id:
                    comment._id,

                userId:
                    comment.userId,

                userName:
                    comment.userName,

                userImage:
                    comment.userImage,

                text:
                    comment.text,

                createdAt:
                    comment.createdAt,

                dateText:
                    comment.createdAt
                        ? new Date(
                            comment.createdAt
                        ).toLocaleString()
                        : ""

            }

        };



        // ==================================================
        // DAIRY ROOM
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";



        // ==================================================
        // SOCKET
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(
                String(dairyId)
            ).emit(
                "postCommentAdded",
                payload
            );

        }



        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json(
            payload
        );


    } catch (err) {

        console.error(
            "POST COMMENT ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    err.message ||
                    "Failed to add post comment"

            });

    }

};



// ==========================================================
// DELETE POST
// ==========================================================

exports.deletePost =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


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
        // DELETE
        // ==================================================

        await updateService.deletePost({

            postId:
                id,

            user

        });



        // ==================================================
        // DAIRY ROOM
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";



        // ==================================================
        // SOCKET
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(
                String(dairyId)
            ).emit(

                "postDeleted",

                {

                    postId:
                        id

                }

            );

        }



        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true

        });


    } catch (err) {

        console.error(
            "DELETE POST ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    err.message ||
                    "Failed to delete post"

            });

    }

};



// ==========================================================
// DELETE COMMENT
// ==========================================================

exports.deleteComment =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


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
        // DELETE COMMENT
        // ==================================================

        await updateService.deleteComment({

            commentId:
                id,

            user

        });



        // ==================================================
        // DAIRY ROOM
        // ==========================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";



        // ==================================================
        // SOCKET
        // ==========================================================

        const io =
            req.app.get("io");


        if (io) {

            io.to(
                String(dairyId)
            ).emit(

                "commentDeleted",

                {

                    commentId:
                        id,

                    postId:
                        req.body
                            ? req.body.postId
                            : null

                }

            );

        }



        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true

        });


    } catch (err) {

        console.error(
            "DELETE COMMENT ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    err.message ||
                    "Failed to delete comment"

                });

    }

};