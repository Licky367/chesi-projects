// ==========================================================
// controllers/update/postController.js
// ==========================================================
//
// PURPOSE:
//     Handles creation and management of feed posts.
//
// POST TARGET SYSTEM:
// ----------------------------------------------------------
//
// CURRENT DAIRY HAS POSITIVE CODE:
//     The current Dairy automatically becomes the target.
//
// CURRENT DAIRY HAS NEGATIVE CODE:
//     User MUST select a target.
//
// TARGET CATEGORIES:
//
//     animal:
//         code > 0
//
//     structure:
//         code === null
//         code === undefined
//         code === ""
//
// NEGATIVE-CODE RECORDS:
//     NEVER valid as post targets.
//
// IMPORTANT:
// ----------------------------------------------------------
// This controller also provides:
//
//     getPostTargets()
//
// which allows create-post.ejs to dynamically load the
// available Phase 2 target list.
//
// This avoids depending on the parent Dairy page controller
// to provide a `dairies` variable.
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
// HELPER:
// DETERMINE WHETHER A VALUE IS A NEGATIVE CODE
// ==========================================================

function hasNegativeCode(code) {

    return (

        code !== null &&

        code !== undefined &&

        code !== "" &&

        Number.isFinite(
            Number(code)
        ) &&

        Number(code) < 0

    );

}



// ==========================================================
// HELPER:
// DETERMINE WHETHER A VALUE IS AN ANIMAL CODE
// ==========================================================

function hasAnimalCode(code) {

    return (

        code !== null &&

        code !== undefined &&

        code !== "" &&

        Number.isFinite(
            Number(code)
        ) &&

        Number(code) > 0

    );

}



// ==========================================================
// HELPER:
// DETERMINE WHETHER A VALUE REPRESENTS A
// STRUCTURE / FACILITY / TOOL
// ==========================================================

function hasNoCode(code) {

    return (

        code === null ||

        code === undefined ||

        code === ""

    );

}



// ==========================================================
// GET POST TARGETS
// ==========================================================
//
// PURPOSE:
//
//     Supplies the Phase 2 list used by create-post.ejs.
//
// URL:
//
//     GET /dairy/:id/post-targets
//
// RESPONSE:
//
//     {
//         success: true,
//         currentDairy: {...},
//         animals: [...],
//         structures: [...]
//     }
//
// RULES:
//
//     animals:
//         code > 0
//
//     structures:
//         code null / undefined / ""
//
//     negative-code records:
//         excluded
//
// ==========================================================

exports.getPostTargets =
async (req, res) => {

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

                    success: false,

                    message:
                        "Unauthorized"

                });

        }



        // ==================================================
        // CURRENT DAIRY ID
        // ==================================================

        const {
            id
        } = req.params;



        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Invalid Dairy ID"

                });

        }



        // ==================================================
        // VERIFY CURRENT DAIRY
        // ==================================================

        const currentDairy =
            await Dairy
                .findById(id)
                .select(
                    "_id name code profileImage"
                )
                .lean();


        if (!currentDairy) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Dairy not found"

                });

        }



        // ==================================================
        // TARGETS
        // ==================================================
        //
        // IMPORTANT:
        //
        // We deliberately do NOT use a generic
        // `Dairy.find({})` response directly.
        //
        // We explicitly divide records according to
        // the business rules.
        //
        // ==================================================

        const allDairies =
            await Dairy
                .find({})
                .select(
                    "_id name code profileImage"
                )
                .sort({
                    name: 1
                })
                .lean();



        // ==================================================
        // ANIMALS
        // ==================================================

        const animals =
            allDairies.filter(
                function (item) {

                    if (!item) {

                        return false;

                    }


                    // Negative codes are NEVER animals.

                    if (
                        hasNegativeCode(
                            item.code
                        )
                    ) {

                        return false;

                    }


                    return hasAnimalCode(
                        item.code
                    );

                }
            );



        // ==================================================
        // STRUCTURES / FACILITIES / TOOLS
        // ==================================================

        const structures =
            allDairies.filter(
                function (item) {

                    if (!item) {

                        return false;

                    }


                    // Explicitly exclude negative codes.

                    if (
                        hasNegativeCode(
                            item.code
                        )
                    ) {

                        return false;

                    }


                    return hasNoCode(
                        item.code
                    );

                }
            );



        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success:
                true,

            currentDairy: {

                _id:
                    currentDairy._id,

                name:
                    currentDairy.name,

                code:
                    currentDairy.code,

                profileImage:
                    currentDairy.profileImage || ""

            },

            animals,

            structures

        });


    } catch (err) {

        console.error(
            "GET POST TARGETS ERROR:",
            err
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Failed to load post targets"

            });

    }

};



// ==========================================================
// CREATE POST
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
                .send(
                    "Unauthorized"
                );

        }



        // ==================================================
        // VALIDATE CURRENT DAIRY ID
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(id)
        ) {

            return res
                .status(400)
                .send(
                    "Invalid Dairy ID"
                );

        }



        // ==================================================
        // LOAD CURRENT DAIRY
        // ==================================================

        const currentDairy =
            await Dairy
                .findById(id)
                .select(
                    "_id name code"
                );


        if (!currentDairy) {

            return res
                .status(404)
                .send(
                    "Dairy not found"
                );

        }



        // ==================================================
        // CURRENT CODE
        // ==================================================

        const currentCode =
            currentDairy.code;



        // ==================================================
        // DETERMINE NEGATIVE PAGE
        // ==================================================

        const currentHasNegativeCode =
            hasNegativeCode(
                currentCode
            );



        // ==================================================
        // DEFAULT TARGET
        // ==================================================
        //
        // For a normal positive-code Dairy page,
        // the current Dairy is automatically the target.
        //
        // ==================================================

        let targetDairyId =
            currentDairy._id;



        // ==================================================
        // NEGATIVE-CODE PAGE
        // ==================================================

        if (
            currentHasNegativeCode
        ) {

            // ----------------------------------------------
            // READ TARGET
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
            // VALIDATE TARGET ID
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
            // LOAD TARGET
            // ----------------------------------------------

            const selectedDairy =
                await Dairy
                    .findById(
                        submittedTargetId
                    )
                    .select(
                        "_id name code"
                    );


            if (!selectedDairy) {

                return res
                    .status(404)
                    .send(
                        "Selected post target not found"
                    );

            }



            // ==================================================
            // NEVER TARGET A NEGATIVE-CODE RECORD
            // ==================================================

            if (
                hasNegativeCode(
                    selectedDairy.code
                )
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

            const isAnimal =
                hasAnimalCode(
                    selectedDairy.code
                );


            const isStructureFacilityTool =
                hasNoCode(
                    selectedDairy.code
                );



            // ==================================================
            // FINAL VALIDATION
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
            // ACCEPT TARGET
            // ==================================================

            targetDairyId =
                selectedDairy._id;

        }



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

        const files =
            Array.isArray(req.files)

                ? req.files

                : [];


        const images =
            files
                .map(
                    function (file) {

                        return (
                            file &&
                            file.filename
                        );

                    }
                )
                .filter(Boolean);



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
                    "Post title, text or image required"
                );

        }



        // ==================================================
        // CREATE POST
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
        // USER IMAGE
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
                Array.isArray(
                    post.images
                )

                    ? post.images

                    : [],

            image:
                post.image || null,

            likes:
                Array.isArray(
                    post.likes
                )

                    ? post.likes.length

                    : 0,

            comments:
                Array.isArray(
                    post.comments
                )

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
            // ACTUAL TARGET ROOM
            // ----------------------------------------------

            io.to(
                String(
                    targetDairyId
                )
            ).emit(
                "postCreated",
                payload
            );



            // ----------------------------------------------
            // ORIGINATING PAGE ROOM
            // ----------------------------------------------

            if (
                String(
                    targetDairyId
                ) !==
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

                    success:
                        false,

                    message:
                        "Unauthorized"

                });

        }



        // ==================================================
        // TOGGLE
        // ==================================================

        const result =
            await updateService.toggleLike({

                postId:
                    id,

                userId:
                    user._id

            });



        // ==================================================
        // ROOM
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
// ADD COMMENT
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

                    success:
                        false,

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
        // CREATE COMMENT
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
                    comment.createdAt

                        ? new Date(
                            comment.createdAt
                        ).toLocaleString()

                        : ""

            }

        };



        // ==================================================
        // ROOM
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
        // ROOM
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
        // DELETE
        // ==================================================

        await updateService.deleteComment({

            commentId:
                id,

            user

        });



        // ==================================================
        // ROOM
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