// ==========================================================
// controllers/update/postController.js
// ==========================================================
//
// PURPOSE:
//     Handles creation and management of normal feed posts.
//
// POST TARGET RULES
// ----------------------------------------------------------
//
// CURRENT DAIRY CODE > 0
//     Automatically targets the current Dairy.
//
// CURRENT DAIRY CODE < 0
//     targetDairyId MUST be supplied.
//
// VALID TARGETS WHEN CURRENT CODE < 0:
//
//     ANIMAL
//         code > 0
//
//     STRUCTURE / FACILITY / TOOL
//         code === null
//         code === undefined
//         code === ""
//
// INVALID:
//     code < 0
//
// IMPORTANT:
//     Negative-code records can NEVER be post targets.
//
// ==========================================================


// ==========================================================
// DEPENDENCIES
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");

const updateService =
    require("../../services/update/postService");


// ==========================================================
// SMALL HELPERS
// ==========================================================

function isValidObjectId(value) {

    return (
        value &&
        mongoose.Types.ObjectId.isValid(value)
    );

}


// ==========================================================
// DETERMINE WHETHER CODE IS POSITIVE
// ==========================================================

function hasPositiveCode(code) {

    if (
        code === null ||
        code === undefined ||
        code === ""
    ) {

        return false;

    }

    const number =
        Number(code);

    return (
        Number.isFinite(number) &&
        number > 0
    );

}


// ==========================================================
// DETERMINE WHETHER CODE IS NEGATIVE
// ==========================================================

function hasNegativeCode(code) {

    if (
        code === null ||
        code === undefined ||
        code === ""
    ) {

        return false;

    }

    const number =
        Number(code);

    return (
        Number.isFinite(number) &&
        number < 0
    );

}


// ==========================================================
// DETERMINE WHETHER RECORD HAS NO CODE
// ==========================================================

function hasNoCode(code) {

    return (
        code === null ||
        code === undefined ||
        code === ""
    );

}


// ==========================================================
// DETERMINE VALID TARGET
// ==========================================================
//
// Returns:
//
//     true  = valid
//     false = invalid
//
// Valid:
//
//     code > 0
//
// OR
//
//     no code
//
// Invalid:
//
//     code < 0
//
// ==========================================================

function isValidPostTargetCode(code) {

    return (
        hasPositiveCode(code) ||
        hasNoCode(code)
    );

}


// ==========================================================
// EXTRACT UPLOADED IMAGES
// ==========================================================
//
// Supports multer:
//
//     upload.array("images")
//
// req.files:
//
//     [
//         {
//             filename: "..."
//         }
//     ]
//
// ==========================================================

function extractImages(req) {

    if (!Array.isArray(req.files)) {

        return [];

    }

    return req.files
        .map(file => {

            if (!file) {
                return null;
            }

            // --------------------------------------------------
            // Cloudinary / custom uploader
            // --------------------------------------------------

            if (file.path) {
                return file.path;
            }

            if (file.secure_url) {
                return file.secure_url;
            }

            if (file.url) {
                return file.url;
            }

            // --------------------------------------------------
            // Multer diskStorage
            // --------------------------------------------------

            if (file.filename) {
                return file.filename;
            }

            return null;

        })
        .filter(Boolean)
        .map(String);

}


// ==========================================================
// CREATE POST
// ==========================================================

exports.createPost =
async (req, res) => {

    try {

        // ==================================================
        // CURRENT DAIRY ID
        // ==================================================

        const {
            id
        } = req.params;


        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const user =
            req.session &&
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
            !isValidObjectId(id)
        ) {

            return res
                .status(400)
                .send("Invalid Dairy ID");

        }


        // ==================================================
        // LOAD CURRENT DAIRY
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
        // CURRENT DAIRY CODE
        // ==================================================

        const currentCode =
            currentDairy.code;


        // ==================================================
        // DETERMINE CURRENT PAGE TYPE
        // ==================================================

        const currentIsPositive =
            hasPositiveCode(
                currentCode
            );


        const currentIsNegative =
            hasNegativeCode(
                currentCode
            );


        // ==================================================
        // TARGET
        // ==================================================
        //
        // POSITIVE PAGE:
        //
        //     current Dairy is automatically the target.
        //
        // NEGATIVE PAGE:
        //
        //     user MUST provide targetDairyId.
        //
        // NO-CODE PAGE:
        //
        //     We do not silently treat it as a negative page.
        //
        // ==================================================

        let targetDairy = null;


        // ==================================================
        // POSITIVE-CODE CURRENT DAIRY
        // ==================================================

        if (currentIsPositive) {

            targetDairy =
                currentDairy;

        }


        // ==================================================
        // NEGATIVE-CODE CURRENT DAIRY
        // ==================================================

        else if (currentIsNegative) {

            // ------------------------------------------------
            // READ TARGET FROM FORM
            // ------------------------------------------------

            const submittedTargetId =
                typeof req.body.targetDairyId === "string"
                    ? req.body.targetDairyId.trim()
                    : "";


            // ------------------------------------------------
            // TARGET REQUIRED
            // ------------------------------------------------

            if (!submittedTargetId) {

                return res
                    .status(400)
                    .send(
                        "Please select what this update is about."
                    );

            }


            // ------------------------------------------------
            // VALIDATE TARGET OBJECT ID
            // ------------------------------------------------

            if (
                !isValidObjectId(
                    submittedTargetId
                )
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target."
                    );

            }


            // ------------------------------------------------
            // LOAD TARGET
            // ------------------------------------------------

            targetDairy =
                await Dairy
                    .findById(
                        submittedTargetId
                    )
                    .select("_id name code");


            if (!targetDairy) {

                return res
                    .status(404)
                    .send(
                        "Selected post target not found."
                    );

            }


            // ------------------------------------------------
            // NEVER ALLOW NEGATIVE TARGET
            // ------------------------------------------------

            if (
                hasNegativeCode(
                    targetDairy.code
                )
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target."
                    );

            }


            // ------------------------------------------------
            // FINAL TARGET VALIDATION
            // ------------------------------------------------

            if (
                !isValidPostTargetCode(
                    targetDairy.code
                )
            ) {

                return res
                    .status(400)
                    .send(
                        "Invalid post target."
                    );

            }

        }


        // ==================================================
        // NO TARGET WAS RESOLVED
        // ==================================================
        //
        // This protects against unexpected current Dairy
        // code values.
        //
        // ==================================================

        if (!targetDairy) {

            return res
                .status(400)
                .send(
                    "Unable to determine post target."
                );

        }


        // ==================================================
        // FINAL TARGET ID
        // ==================================================

        const targetDairyId =
            targetDairy._id;


        // ==================================================
        // POST TITLE
        // ==================================================

        const title =
            typeof req.body.title === "string"
                ? req.body.title.trim()
                : "";


        // ==================================================
        // POST TEXT
        // ==================================================

        const text =
            typeof req.body.text === "string"
                ? req.body.text.trim()
                : "";


        // ==================================================
        // IMAGES
        // ==================================================

        const images =
            extractImages(req);


        // ==================================================
        // CONTENT VALIDATION
        // ==================================================

        if (
            !title &&
            !text &&
            images.length === 0
        ) {

            return res
                .status(400)
                .send(
                    "Post title, text or image required."
                );

        }


        // ==================================================
        // CREATE POST
        // ==================================================
        //
        // IMPORTANT:
        //
        // The service receives ONLY the actual target:
        //
        //     dairyId = targetDairyId
        //
        // It does not need to know whether the post came
        // from an animal page or a general farm page.
        //
        // ==================================================

        const post =
            await updateService.createPost({

                dairyId:
                    targetDairyId,

                userId:
                    user._id,

                userName:
                    user.name || "",

                userImage:
                    user.profileImage || "",

                title,

                text,

                images

            });


        // ==================================================
        // USER IMAGE FOR SOCKET PAYLOAD
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

            // ----------------------------------------------
            // ACTUAL TARGET
            // ----------------------------------------------

            dairyId:
                post.dairy,

            // ----------------------------------------------
            // AUTHOR
            // ----------------------------------------------

            userId:
                user._id,

            userName:
                post.userName ||
                user.name ||
                "",

            userImage,

            // ----------------------------------------------
            // TYPE
            // ----------------------------------------------

            type:
                post.type,

            // ----------------------------------------------
            // CONTENT
            // ----------------------------------------------

            title:
                post.title || "",

            text:
                post.text || "",

            // ----------------------------------------------
            // IMAGES
            // ----------------------------------------------

            images:
                Array.isArray(post.images)
                    ? post.images
                    : [],

            // ----------------------------------------------
            // BACKWARDS COMPATIBILITY
            // ----------------------------------------------

            image:
                post.image || null,

            // ----------------------------------------------
            // ENGAGEMENT
            // ----------------------------------------------

            likes:
                Array.isArray(post.likes)
                    ? post.likes.length
                    : 0,

            comments:
                Array.isArray(post.comments)
                    ? post.comments
                    : [],

            // ----------------------------------------------
            // DATE
            // ----------------------------------------------

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

            // ------------------------------------------------
            // TARGET DAIRY ROOM
            // ------------------------------------------------

            io.to(
                String(targetDairyId)
            ).emit(
                "postCreated",
                payload
            );


            // ------------------------------------------------
            // ORIGINATING PAGE ROOM
            // ------------------------------------------------
            //
            // If the current page is a negative-code page
            // and the selected target is another Dairy,
            // notify that originating page too.
            //
            // ------------------------------------------------

            if (
                String(targetDairyId) !==
                String(currentDairy._id)
            ) {

                io.to(
                    String(currentDairy._id)
                ).emit(
                    "postCreated",
                    payload
                );

            }

        }


        // ==================================================
        // REDIRECT BACK TO ORIGINATING PAGE
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
            req.session &&
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
        // VALIDATE POST ID
        // ==================================================

        if (
            !isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Invalid post ID"

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
        // SOCKET
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            const dairyId =
                req.body &&
                req.body.dairyId
                    ? req.body.dairyId
                    : "all";


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
// ADD COMMENT
// ==========================================================

exports.addPostComment =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const user =
            req.session &&
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
        // VALIDATE POST ID
        // ==================================================

        if (
            !isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Invalid post ID"

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

                    success: false,

                    message:
                        "Comment text required"

                });

        }


        // ==================================================
        // CREATE COMMENT
        // ==================================================

        const comment =
            await updateService.addPostComment({

                postId:
                    id,

                userId:
                    user._id,

                userName:
                    user.name || "",

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
                    comment.createdAt
                        ? new Date(
                            comment.createdAt
                        ).toLocaleString()
                        : ""

            }

        };


        // ==================================================
        // SOCKET
        // ==================================================

        const io =
            req.app.get("io");


        if (io) {

            const dairyId =
                req.body &&
                req.body.dairyId
                    ? req.body.dairyId
                    : "all";


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
            req.session &&
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
        // VALIDATE POST ID
        // ==================================================

        if (
            !isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Invalid post ID"

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

        const io =
            req.app.get("io");


        if (io) {

            const dairyId =
                req.body &&
                req.body.dairyId
                    ? req.body.dairyId
                    : "all";


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
            req.session &&
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
        // VALIDATE COMMENT ID
        // ==================================================

        if (
            !isValidObjectId(id)
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Invalid comment ID"

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

        const io =
            req.app.get("io");


        if (io) {

            const dairyId =
                req.body &&
                req.body.dairyId
                    ? req.body.dairyId
                    : "all";


            io.to(
                String(dairyId)
            ).emit(
                "commentDeleted",
                {

                    commentId:
                        id,

                    postId:
                        req.body &&
                        req.body.postId
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