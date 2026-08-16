<% /* =========================================================
     controllers/update/postController.js

     PURPOSE:
         Handles creation and management of feed posts.

     CREATE POST TARGET RULES:
     ---------------------------------------------------------
     CURRENT DAIRY HAS POSITIVE CODE:
         The post automatically belongs to the current Dairy.

     CURRENT DAIRY HAS NEGATIVE CODE:
         User must submit targetDairyId.

         Valid target:
             1. Animal
                    code > 0

             2. Structure / Facility / Tool
                    code === null
                    code === undefined
                    code === ""

         Negative-code records are NEVER valid targets.

     The selected Dairy _id is passed to updateService.createPost()
     as dairyId.
========================================================= */


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
// Uploaded files are supplied by:
//
//     req.files
//
// TARGET:
//
//     Positive-code page:
//         current Dairy is the target.
//
//     Negative-code page:
//         targetDairyId determines the target.
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
        // CURRENT DAIRY
        // ==================================================
        //
        // We load the current Dairy from the database rather
        // than trusting the browser's understanding of its code.
        //
        // This determines whether targetDairyId is required.
        //
        // ==================================================

        const currentDairy =
            await Dairy.findById(id)
                .select("_id name code");


        if (!currentDairy) {

            return res
                .status(404)
                .send("Dairy not found");

        }


        // ==================================================
        // DETERMINE POST TARGET
        // ==================================================

        let targetDairyId =
            currentDairy._id;


        /*
         * A negative-code Dairy is a general farm /
         * facility / structure / tool context.
         *
         * Therefore the user must explicitly choose
         * what the post concerns.
         */

        if (
            Number(currentDairy.code) < 0
        ) {


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
            // TARGET ID VALIDATION
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


            // ----------------------------------------------
            // FIND SELECTED TARGET
            // ----------------------------------------------

            const selectedDairy =
                await Dairy.findById(
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
            // VALIDATE TARGET CODE
            // ==================================================
            //
            // Valid targets are ONLY:
            //
            //     Animal:
            //         code > 0
            //
            //     Structure / Facility / Tool:
            //         no code
            //
            // Negative-code Dairy records are NOT valid targets.
            //
            // ==================================================

            const targetCode =
                selectedDairy.code;


            const isAnimal =
                targetCode !== null &&
                targetCode !== undefined &&
                targetCode !== "" &&
                Number(targetCode) > 0;


            const isStructureFacilityTool =
                targetCode === null ||
                targetCode === undefined ||
                targetCode === "";


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


            // ----------------------------------------------
            // ACCEPT SELECTED TARGET
            // ----------------------------------------------

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
                    file => file.filename
                )
                .filter(Boolean);



        // ==================================================
        // VALIDATION
        // ==================================================
        //
        // A post must contain at least one of:
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
        // dairyId is now targetDairyId, not necessarily
        // the :id from the URL.
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
        // REAL USER IMAGE
        // ==================================================

        const userImage =
            user.profileImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name
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
                new Date(
                    post.createdAt
                ).toLocaleString()

        };



        // ==================================================
        // SOCKET.IO
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            /*
             * Emit to the TARGET Dairy room.
             *
             * This means users viewing the Dairy that the
             * post actually concerns can receive it in real
             * time.
             */

            io.to(
                String(targetDairyId)
            ).emit(
                "postCreated",
                payload
            );



            /*
             * If the page from which the post was created is
             * different from the selected target, also notify
             * the originating page.
             *
             * This is useful when creating a post from a
             * general farm page about a specific animal or
             * structure.
             */

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
        // Keep the user on the page from which they created
        // the post.
        //
        // The post itself belongs to targetDairyId.
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

            return res.status(401).json({

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

            io.to(dairyId).emit(

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


        return res.status(500).json({

            success:
                false,

            message:
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

            return res.status(401).json({

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

            return res.status(400).json({

                success: false,

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
        // PAYLOAD
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
                    new Date(
                        comment.createdAt
                    ).toLocaleString()

            }

        };


        // ==================================================
        // SOCKET
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";


        const io =
            req.app.get("io");


        if (io) {

            io.to(dairyId).emit(
                "postCommentAdded",
                payload
            );

        }


        return res.json(
            payload
        );


    } catch (err) {

        console.error(
            "POST COMMENT ERROR:",
            err
        );


        return res.status(500).json({

            success:
                false,

            message:
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

            return res.status(401).json({

                success: false,

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
        // SOCKET
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";


        const io =
            req.app.get("io");


        if (io) {

            io.to(dairyId).emit(

                "postDeleted",

                {

                    postId:
                        id

                }

            );

        }


        return res.json({

            success:
                true

        });


    } catch (err) {

        console.error(
            "DELETE POST ERROR:",
            err
        );


        return res.status(500).json({

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

            return res.status(401).json({

                success: false,

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
        // SOCKET
        // ==================================================

        const dairyId =
            req.body &&
            req.body.dairyId
                ? req.body.dairyId
                : "all";


        const io =
            req.app.get("io");


        if (io) {

            io.to(dairyId).emit(

                "commentDeleted",

                {

                    commentId:
                        id,

                    postId:
                        req.body.postId

                }

            );

        }


        return res.json({

            success:
                true

        });


    } catch (err) {

        console.error(
            "DELETE COMMENT ERROR:",
            err
        );


        return res.status(500).json({

            success:
                false,

            message:
                err.message ||
                "Failed to delete comment"

        });

    }

};