// ==========================================================
// services/update/postService.js
// ==========================================================
//
// PURPOSE:
//     Handles creation and management of normal feed posts.
//
// POST TARGET SYSTEM:
// ----------------------------------------------------------
//
//     The controller determines which Dairy record the post
//     concerns and passes that record as:
//
//         dairyId
//
//     This service treats dairyId as the ACTUAL post target.
//
// VALID POST TARGETS:
// ----------------------------------------------------------
//
//     1. ANIMAL
//            code > 0
//
//     2. STRUCTURE / FACILITY / TOOL
//            code === null
//            code === undefined
//            code === ""
//
// INVALID TARGET:
//            code < 0
//
// IMPORTANT:
// ----------------------------------------------------------
//
//     Negative-code records represent general farm,
//     facility/farm context pages and must NEVER themselves
//     become the target of a normal post.
//
// ==========================================================



// ==========================================================
// DEPENDENCIES
// ==========================================================

const mongoose =
    require("mongoose");


const Update =
    require("../../models/Update");


const ProjectUser =
    require("../../models/projectUser");


const Dairy =
    require("../../models/dairy");


const {
    formatComment
} = require("./helpers");



// ==========================================================
// INTERNAL HELPERS
// ==========================================================

/**
 * Determines whether a Dairy record is an animal.
 *
 * Valid animal:
 *
 *     code > 0
 */
function isAnimal(dairy) {

    if (!dairy) {
        return false;
    }

    const code =
        dairy.code;

    return (
        code !== null &&
        code !== undefined &&
        code !== "" &&
        Number(code) > 0
    );
}



/**
 * Determines whether a Dairy record is a
 * structure / facility / tool.
 *
 * Valid structure/facility/tool:
 *
 *     code === null
 *     code === undefined
 *     code === ""
 *
 * Negative codes are deliberately excluded.
 */
function isStructureFacilityTool(dairy) {

    if (!dairy) {
        return false;
    }

    const code =
        dairy.code;

    return (
        code === null ||
        code === undefined ||
        code === ""
    );
}



/**
 * Determines whether a Dairy record is a valid
 * normal-post target.
 */
function isValidPostTarget(dairy) {

    return (
        isAnimal(dairy) ||
        isStructureFacilityTool(dairy)
    );

}



// ==========================================================
// GET POST TARGETS
// ==========================================================
//
// PURPOSE:
//
//     Supplies the records required by create-post.ejs
//     Phase 2.
//
// RETURNS:
//
//     {
//         animals: [...],
//         structures: [...]
//     }
//
// IMPORTANT:
//
//     Negative-code records are NEVER returned.
//
//     Animals:
//
//         code > 0
//
//     Structures / Facilities / Tools:
//
//         no code
//
// ==========================================================

exports.getPostTargets =
async () => {

    // ======================================================
    // FETCH ONLY POSSIBLE POST TARGETS
    // ======================================================
    //
    // We intentionally do not include negative-code records.
    //
    // The query uses $or so that both target categories are
    // retrieved.
    //
    // ======================================================

    const records =
        await Dairy
            .find({

                $or: [

                    // --------------------------------------
                    // ANIMALS
                    // --------------------------------------

                    {
                        code: {
                            $gt: 0
                        }
                    },


                    // --------------------------------------
                    // STRUCTURE / FACILITY / TOOL
                    //
                    // Missing code
                    // --------------------------------------

                    {
                        code: {
                            $exists: false
                        }
                    },


                    // --------------------------------------
                    // Explicit null
                    // --------------------------------------

                    {
                        code: null
                    }

                ]

            })
            .select(
                "_id name code profileImage dateOfBirth mass isMilking"
            )
            .sort({
                name: 1
            })
            .lean();



    // ======================================================
    // SEPARATE TARGET CATEGORIES
    // ======================================================

    const animals = [];

    const structures = [];



    records.forEach(
        function (record) {

            // ----------------------------------------------
            // ANIMAL
            // ----------------------------------------------

            if (
                isAnimal(record)
            ) {

                animals.push(record);

                return;

            }


            // ----------------------------------------------
            // STRUCTURE / FACILITY / TOOL
            // ----------------------------------------------

            if (
                isStructureFacilityTool(record)
            ) {

                structures.push(record);

            }

        }
    );



    // ======================================================
    // RETURN
    // ======================================================

    return {

        animals,

        structures

    };

};



// ==========================================================
// GET ALL POST TARGETS
// ==========================================================
//
// This function is useful when the controller wants a single
// array to send to create-post.ejs.
//
// The EJS can then perform its own category filtering.
//
// ==========================================================

exports.getAllPostTargets =
async () => {

    const targets =
        await exports.getPostTargets();



    return [

        ...targets.animals,

        ...targets.structures

    ];

};



// ==========================================================
// GET SINGLE POST TARGET
// ==========================================================
//
// PURPOSE:
//
//     Safely resolve a target Dairy by ID.
//
//     This is useful for controller/service validation.
//
// ==========================================================

exports.getPostTargetById =
async (
    dairyId
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        return null;

    }



    // ======================================================
    // FIND RECORD
    // ======================================================

    const dairy =
        await Dairy
            .findById(dairyId)
            .select(
                "_id name code profileImage dateOfBirth mass isMilking"
            )
            .lean();



    if (!dairy) {

        return null;

    }



    // ======================================================
    // TARGET VALIDATION
    // ======================================================

    if (
        !isValidPostTarget(dairy)
    ) {

        return null;

    }



    return dairy;

};



// ==========================================================
// CREATE POST
// ==========================================================
//
// Creates a normal feed post.
//
// REQUIRED:
//
//     dairyId
//         Actual Dairy record that the post concerns.
//
//     userId
//         Authenticated user.
//
// SUPPORTS:
//
//     title
//     text
//     images[]
//
// ==========================================================

exports.createPost =
async ({

    dairyId,

    userId,

    userName,

    userImage = "",

    title,

    text,

    images = []

}) => {


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        throw new Error(
            "Invalid post Dairy."
        );

    }



    // ======================================================
    // VERIFY TARGET DAIRY EXISTS
    // ======================================================

    const dairy =
        await Dairy
            .findById(dairyId)
            .select(
                "_id name code"
            );



    if (!dairy) {

        throw new Error(
            "Post Dairy not found."
        );

    }



    // ======================================================
    // VERIFY TARGET IS VALID
    // ======================================================
    //
    // The controller should already have performed this
    // validation.
    //
    // The service repeats it because the service is the final
    // persistence boundary.
    //
    // ======================================================

    if (
        !isValidPostTarget(dairy)
    ) {

        throw new Error(
            "The selected Dairy cannot be a post target."
        );

    }



    // ======================================================
    // USER ID VALIDATION
    // ======================================================

    if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(
            userId
        )
    ) {

        throw new Error(
            "Invalid post author."
        );

    }



    // ======================================================
    // RESOLVE USER INFORMATION
    // ======================================================

    let resolvedUserName =
        typeof userName === "string"
            ? userName.trim()
            : "";


    let resolvedUserImage =
        typeof userImage === "string"
            ? userImage.trim()
            : "";



    // ======================================================
    // GET CURRENT USER
    // ======================================================
    //
    // Do not rely entirely on browser/session values.
    //
    // The database is the source of truth.
    //
    // ======================================================

    const user =
        await ProjectUser
            .findById(userId)
            .select(
                "name profileImage"
            );



    if (user) {

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------

        if (
            user.name
        ) {

            resolvedUserName =
                user.name;

        }


        // --------------------------------------------------
        // IMAGE
        // --------------------------------------------------

        if (
            user.profileImage
        ) {

            resolvedUserImage =
                user.profileImage;

        }

    }



    // ======================================================
    // NORMALIZE TITLE
    // ======================================================

    const normalizedTitle =
        typeof title === "string"
            ? title.trim()
            : "";



    // ======================================================
    // NORMALIZE TEXT
    // ======================================================

    const normalizedText =
        typeof text === "string"
            ? text.trim()
            : "";



    // ======================================================
    // NORMALIZE IMAGES
    // ======================================================

    const normalizedImages =
        Array.isArray(images)

            ? images
                .filter(
                    image =>
                        image !== null &&
                        image !== undefined &&
                        String(image).trim() !== ""
                )
                .map(
                    image =>
                        String(image).trim()
                )

            : [];



    // ======================================================
    // VALIDATE CONTENT
    // ======================================================

    if (
        !normalizedTitle &&
        !normalizedText &&
        normalizedImages.length === 0
    ) {

        throw new Error(
            "Post title, text or image required."
        );

    }



    // ======================================================
    // CREATE POST
    // ======================================================
    //
    // IMPORTANT:
    //
    // dairy = ACTUAL TARGET
    //
    // NOT the originating page.
    //
    // ======================================================

    const post =
        await Update.create({

            // ----------------------------------------------
            // TARGET
            // ----------------------------------------------

            dairy:
                dairy._id,


            // ----------------------------------------------
            // AUTHOR
            // ----------------------------------------------

            user:
                userId,


            userName:
                resolvedUserName,


            userImage:
                resolvedUserImage,


            // ----------------------------------------------
            // TYPE
            // ----------------------------------------------

            type:
                "post",


            // ----------------------------------------------
            // CONTENT
            // ----------------------------------------------

            title:
                normalizedTitle,


            text:
                normalizedText,


            // ----------------------------------------------
            // MULTIPLE IMAGES
            // ----------------------------------------------

            images:
                normalizedImages,


            // ----------------------------------------------
            // LEGACY IMAGE FIELD
            // ----------------------------------------------
            //
            // New posts use `images`.
            //
            // Keep legacy field empty.
            //
            // ----------------------------------------------

            image:
                null,


            // ----------------------------------------------
            // ENGAGEMENT
            // ----------------------------------------------

            likes:
                [],


            comments:
                []

        });



    // ======================================================
    // RETURN
    // ======================================================

    return post;

};



// ==========================================================
// LIKE / UNLIKE POST
// ==========================================================

exports.toggleLike =
async ({

    postId,

    userId

}) => {


    // ======================================================
    // VALIDATE IDs
    // ======================================================

    if (
        !postId ||
        !mongoose.Types.ObjectId.isValid(
            postId
        )
    ) {

        throw new Error(
            "Invalid post."
        );

    }


    if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(
            userId
        )
    ) {

        throw new Error(
            "Invalid user."
        );

    }



    // ======================================================
    // FIND POST
    // ======================================================

    const post =
        await Update.findById(
            postId
        );


    if (!post) {

        throw new Error(
            "Post not found."
        );

    }



    // ======================================================
    // ENSURE LIKES ARRAY
    // ======================================================

    if (
        !Array.isArray(
            post.likes
        )
    ) {

        post.likes = [];

    }



    // ======================================================
    // FIND EXISTING LIKE
    // ======================================================

    const index =
        post.likes.findIndex(

            id => {

                if (
                    !id
                ) {

                    return false;

                }

                return (
                    id.toString() ===
                    userId.toString()
                );

            }

        );



    // ======================================================
    // TOGGLE
    // ======================================================

    let liked =
        false;



    // ------------------------------------------------------
    // UNLIKE
    // ------------------------------------------------------

    if (
        index >= 0
    ) {

        post.likes.splice(
            index,
            1
        );


        liked =
            false;

    }



    // ------------------------------------------------------
    // LIKE
    // ------------------------------------------------------

    else {

        post.likes.push(
            userId
        );


        liked =
            true;

    }



    // ======================================================
    // SAVE
    // ======================================================

    await post.save();



    // ======================================================
    // RETURN
    // ======================================================

    return {

        liked,

        likes:
            post.likes.length

    };

};



// ==========================================================
// ADD COMMENT TO POST
// ==========================================================

exports.addPostComment =
async ({

    postId,

    userId,

    userName,

    userImage = "",

    text

}) => {


    // ======================================================
    // VALIDATE POST ID
    // ======================================================

    if (
        !postId ||
        !mongoose.Types.ObjectId.isValid(
            postId
        )
    ) {

        throw new Error(
            "Invalid post."
        );

    }



    // ======================================================
    // VALIDATE USER ID
    // ======================================================

    if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(
            userId
        )
    ) {

        throw new Error(
            "Invalid comment author."
        );

    }



    // ======================================================
    // FIND POST
    // ======================================================

    const post =
        await Update.findById(
            postId
        );


    if (!post) {

        throw new Error(
            "Post not found."
        );

    }



    // ======================================================
    // NORMALIZE TEXT
    // ======================================================

    const normalizedText =
        typeof text === "string"
            ? text.trim()
            : "";



    if (!normalizedText) {

        throw new Error(
            "Comment text required."
        );

    }



    // ======================================================
    // ENSURE COMMENTS ARRAY
    // ======================================================

    if (
        !Array.isArray(
            post.comments
        )
    ) {

        post.comments = [];

    }



    // ======================================================
    // RESOLVE USER
    // ======================================================

    let resolvedUserName =
        typeof userName === "string"
            ? userName.trim()
            : "";


    let resolvedUserImage =
        typeof userImage === "string"
            ? userImage.trim()
            : "";



    const user =
        await ProjectUser
            .findById(userId)
            .select(
                "name profileImage"
            );



    if (user) {

        if (
            user.name
        ) {

            resolvedUserName =
                user.name;

        }


        if (
            user.profileImage
        ) {

            resolvedUserImage =
                user.profileImage;

        }

    }



    // ======================================================
    // CREATE COMMENT
    // ======================================================

    const comment = {

        userId:
            userId,

        userName:
            resolvedUserName,

        userImage:
            resolvedUserImage,

        text:
            normalizedText,

        createdAt:
            new Date()

    };



    // ======================================================
    // ADD
    // ======================================================

    post.comments.push(
        comment
    );



    // ======================================================
    // SAVE
    // ======================================================

    await post.save();



    // ======================================================
    // RETURN FORMATTED COMMENT
    // ======================================================

    return formatComment(
        comment
    );

};



// ==========================================================
// DELETE POST
// ==========================================================

exports.deletePost =
async ({

    postId,

    user

}) => {


    // ======================================================
    // VALIDATE
    // ======================================================

    if (
        !postId ||
        !mongoose.Types.ObjectId.isValid(
            postId
        )
    ) {

        throw new Error(
            "Invalid post."
        );

    }



    if (
        !user ||
        !user._id
    ) {

        throw new Error(
            "Unauthorized."
        );

    }



    // ======================================================
    // FIND POST
    // ======================================================

    const post =
        await Update.findById(
            postId
        );


    if (!post) {

        throw new Error(
            "Post not found."
        );

    }



    // ======================================================
    // OWNER
    // ======================================================

    const owner =
        post.user &&
        String(post.user) ===
        String(user._id);



    // ======================================================
    // ADMIN
    // ======================================================

    const admin =
        user.role === "admin";



    // ======================================================
    // AUTHORIZATION
    // ======================================================

    if (
        !owner &&
        !admin
    ) {

        throw new Error(
            "Not authorized."
        );

    }



    // ======================================================
    // DELETE
    // ======================================================

    await Update.findByIdAndDelete(
        postId
    );



    return true;

};



// ==========================================================
// DELETE COMMENT
// ==========================================================

exports.deleteComment =
async ({

    commentId,

    user

}) => {


    // ======================================================
    // VALIDATE COMMENT ID
    // ======================================================

    if (
        !commentId ||
        !mongoose.Types.ObjectId.isValid(
            commentId
        )
    ) {

        throw new Error(
            "Invalid comment."
        );

    }



    if (
        !user ||
        !user._id
    ) {

        throw new Error(
            "Unauthorized."
        );

    }



    // ======================================================
    // FIND POST
    // ======================================================

    const post =
        await Update.findOne({

            "comments._id":
                commentId

        });



    if (!post) {

        throw new Error(
            "Comment not found."
        );

    }



    // ======================================================
    // FIND COMMENT
    // ======================================================

    const comment =
        post.comments.find(

            c => {

                return (
                    c &&
                    c._id &&
                    String(c._id) ===
                    String(commentId)
                );

            }

        );



    if (!comment) {

        throw new Error(
            "Comment not found."
        );

    }



    // ======================================================
    // OWNER
    // ======================================================

    const owner =
        comment.userId &&
        String(comment.userId) ===
        String(user._id);



    // ======================================================
    // ADMIN
    // ======================================================

    const admin =
        user.role === "admin";



    // ======================================================
    // AUTHORIZATION
    // ======================================================

    if (
        !owner &&
        !admin
    ) {

        throw new Error(
            "Not authorized."
        );

    }



    // ======================================================
    // REMOVE COMMENT
    // ======================================================

    post.comments =
        post.comments.filter(

            c => {

                return !(
                    c &&
                    c._id &&
                    String(c._id) ===
                    String(commentId)
                );

            }

        );



    // ======================================================
    // SAVE
    // ======================================================

    await post.save();



    return true;

};



// ==========================================================
// EXPORT TARGET VALIDATION HELPERS
// ==========================================================
//
// These are intentionally exposed so the controller can use
// exactly the same target rules as the service.
//
// ==========================================================

exports.isAnimal =
    isAnimal;


exports.isStructureFacilityTool =
    isStructureFacilityTool;


exports.isValidPostTarget =
    isValidPostTarget;