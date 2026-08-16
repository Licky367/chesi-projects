// ==========================================================
// services/update/postService.js
// ==========================================================
//
// PURPOSE:
//     Handles creation and management of normal feed posts.
//
// POST TARGET:
//
//     dairyId is the ACTUAL Dairy record that the post
//     concerns.
//
//     The controller is responsible for determining the
//     correct targetDairyId.
//
//     This service simply persists that Dairy ID.
//
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
// dairyId:
//     The actual Dairy record the post concerns.
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
    // VERIFY DAIRY EXISTS
    // ======================================================
    //
    // The controller already validates the target.
    //
    // We still verify it here because the service should
    // never create a post pointing to a nonexistent record.
    //
    // ======================================================

    const dairy =
        await Dairy
            .findById(dairyId)
            .select("_id name code");


    if (!dairy) {

        throw new Error(
            "Post Dairy not found."
        );

    }



    // ======================================================
    // RESOLVE USER NAME
    // ======================================================

    let resolvedUserName =
        userName || "";



    // ======================================================
    // RESOLVE USER IMAGE
    // ======================================================

    let resolvedUserImage =
        userImage || "";



    // ======================================================
    // GET REAL USER DATA
    // ======================================================
    //
    // Do not rely entirely on the values sent by the
    // controller.
    //
    // If the user still exists, use the current profile
    // information.
    //
    // ======================================================

    if (userId) {


        const user =
            await ProjectUser
                .findById(userId)
                .select(
                    "name profileImage"
                );


        if (user) {


            // ----------------------------------------------
            // REAL USER NAME
            // ----------------------------------------------

            if (user.name) {

                resolvedUserName =
                    user.name;

            }


            // ----------------------------------------------
            // REAL USER IMAGE
            // ----------------------------------------------

            if (user.profileImage) {

                resolvedUserImage =
                    user.profileImage;

            }

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
                .filter(Boolean)
                .map(String)

            : [];



    // ======================================================
    // VALIDATE POST CONTENT
    // ======================================================
    //
    // A post must contain at least one of:
    //
    //     title
    //     text
    //     image
    //
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
    // CREATE UPDATE
    // ======================================================
    //
    // IMPORTANT:
    //
    // `dairy` receives the target Dairy ID.
    //
    // This is what makes:
    //
    //     User Name about Dairy Name
    //
    // possible later in post.ejs.
    //
    // ======================================================

    const post =
        await Update.create({

            // ----------------------------------------------
            // ACTUAL POST TARGET
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
            // IMAGES
            // ----------------------------------------------

            images:
                normalizedImages,


            // ----------------------------------------------
            // BACKWARDS COMPATIBILITY
            // ----------------------------------------------
            //
            // New posts use `images`.
            //
            // Older records may still contain `image`.
            //
            // Keep this field empty for new posts.
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
    // RETURN CREATED POST
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

            id =>

                id.toString() ===
                userId.toString()

        );



    // ======================================================
    // DEFAULT
    // ======================================================

    let liked =
        false;



    // ======================================================
    // UNLIKE
    // ======================================================

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


    // ======================================================
    // LIKE
    // ======================================================

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
    // RESULT
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
    // NORMALIZE COMMENT TEXT
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
    // CREATE COMMENT
    // ======================================================

    const comment = {

        userId:
            userId,

        userName:
            userName || "",

        userImage:
            userImage || "",

        text:
            normalizedText,

        createdAt:
            new Date()

    };



    // ======================================================
    // ADD COMMENT
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

        user._id &&

        post.user.toString() ===
        user._id.toString();



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



    // ======================================================
    // SUCCESS
    // ======================================================

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
    // FIND POST CONTAINING COMMENT
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

            c =>

                c._id.toString() ===
                commentId.toString()

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

        user._id &&

        comment.userId.toString() ===
        user._id.toString();



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

            c =>

                c._id.toString() !==
                commentId.toString()

        );



    // ======================================================
    // SAVE
    // ======================================================

    await post.save();



    // ======================================================
    // SUCCESS
    // ======================================================

    return true;

};