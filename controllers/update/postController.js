// ==========================================================
// controllers/update/postController.js
// ==========================================================

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
                .map(file => file.filename)
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

        const post =
            await updateService.createPost({

                dairyId:
                    id,

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

            io.to(id).emit(
                "postCreated",
                payload
            );

        }


        // ==================================================
        // REDIRECT
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