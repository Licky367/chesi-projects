// ==========================================================
// controllers/update/postController.js
// ==========================================================

const updateService =
    require("../../services/update");


// ==========================================================
// CREATE POST
// ==========================================================
//
// Supports:
//
//     title
//     text
//     multiple images
//
// Images are supplied by:
//
//     upload.array("images", 10)
//
// Therefore:
//
//     req.files
//
// is an array.
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
        // LOGGED-IN USER
        // ==================================================

        const user =
            req.session.user;


        if (!user) {

            return res
                .status(401)
                .send("Unauthorized");

        }


        // ==================================================
        // POST CONTENT
        // ==================================================

        const title =
            req.body.title
                ?.trim() || "";


        const text =
            req.body.text
                ?.trim() || "";


        // ==================================================
        // IMAGES
        // ==================================================
        //
        // upload.array("images", 10)
        //
        // produces:
        //
        // req.files = [
        //     file,
        //     file,
        //     file
        // ]
        //
        // ==================================================

        const images =
            Array.isArray(req.files)

                ? req.files
                    .map(file => file.filename)
                    .filter(Boolean)

                : [];


        // ==================================================
        // VALIDATION
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

                title:
                    title,

                text:
                    text,

                images:
                    images

            });


        // ==================================================
        // USER IMAGE
        // ==================================================

        const userImage =
            user.profileImage ||

            `https://ui-avatars.com/api/?name=${
                encodeURIComponent(
                    user.name
                )
            }`;


        // ==================================================
        // SOCKET.IO PAYLOAD
        // ==================================================

        const payload = {

            _id:
                post._id,

            dairyId:
                id,

            userId:
                user._id,

            userName:
                user.name,

            userImage:
                userImage,

            title:
                post.title || "",

            text:
                post.text || "",

            images:
                Array.isArray(post.images)
                    ? post.images
                    : [],

            // ------------------------------------------------
            // Backward compatibility for existing frontend
            // ------------------------------------------------

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

                success:
                    false,

                message:
                    "Unauthorized"

            });

        }


        const result =
            await updateService.toggleLike({

                postId:
                    id,

                userId:
                    user._id

            });


        const io =
            req.app.get("io");


        if (io) {

            io.to(
                req.body.dairyId ||
                "all"
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
            err.message
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

                success:
                    false,

                message:
                    "Unauthorized"

            });

        }


        const text =
            req.body.text
                ?.trim();


        if (!text) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Comment text required"

            });

        }


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

                text:
                    text

            });


        const payload = {

            success:
                true,

            postId:
                id,

            comment: {

                _id:
                    comment._id,

                userId:
                    user._id,

                userName:
                    user.name,

                userImage:
                    user.profileImage ||

                    `https://ui-avatars.com/api/?name=${
                        encodeURIComponent(
                            user.name
                        )
                    }`,

                text:
                    comment.text,

                dateText:
                    new Date(
                        comment.createdAt
                    ).toLocaleString()

            }

        };


        const io =
            req.app.get("io");


        if (io) {

            io.to(
                req.body.dairyId ||
                "all"
            ).emit(
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
            err.message
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

                success:
                    false,

                message:
                    "Unauthorized"

            });

        }


        await updateService.deletePost({

            postId:
                id,

            user:
                user

        });


        const io =
            req.app.get("io");


        if (io) {

            io.to(
                req.body.dairyId ||
                "all"
            ).emit(

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
            err.message
        );


        return res.status(500).json({

            success:
                false,

            message:
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

                success:
                    false,

                message:
                    "Unauthorized"

            });

        }


        await updateService.deleteComment({

            commentId:
                id,

            user:
                user

        });


        const io =
            req.app.get("io");


        if (io) {

            io.to(
                req.body.dairyId ||
                "all"
            ).emit(

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
            err.message
        );


        return res.status(500).json({

            success:
                false,

            message:
                "Failed to delete comment"

        });

    }

};