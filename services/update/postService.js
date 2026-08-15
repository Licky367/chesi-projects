// ==========================================================
// services/update/postService.js
// ==========================================================

const Update =
    require("../../models/Update");

const ProjectUser =
    require("../../models/projectUser");

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

    if (userId) {

        const user =
            await ProjectUser
                .findById(userId)
                .select("name profileImage");


        if (user) {

            if (user.name) {

                resolvedUserName =
                    user.name;

            }


            if (user.profileImage) {

                resolvedUserImage =
                    user.profileImage;

            }

        }

    }


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
    // CREATE UPDATE
    // ======================================================

    return await Update.create({

        dairy:
            dairyId,

        user:
            userId,

        userName:
            resolvedUserName,

        userImage:
            resolvedUserImage,

        type:
            "post",

        title:
            title || "",

        text:
            text || "",

        images:
            normalizedImages,

        // ----------------------------------------------
        // New posts use `images`.
        //
        // Keep `image` empty for compatibility with
        // older records.
        // ----------------------------------------------

        image:
            null,

        likes:
            [],

        comments:
            []

    });

};



// ==========================================================
// LIKE / UNLIKE POST
// ==========================================================

exports.toggleLike =
async ({

    postId,

    userId

}) => {

    const post =
        await Update.findById(
            postId
        );


    if (!post) {

        throw new Error(
            "Post not found."
        );

    }


    if (
        !Array.isArray(
            post.likes
        )
    ) {

        post.likes = [];

    }


    const index =
        post.likes.findIndex(

            id =>

                id.toString() ===
                userId.toString()

        );


    let liked =
        false;


    if (index >= 0) {

        post.likes.splice(
            index,
            1
        );

        liked =
            false;

    } else {

        post.likes.push(
            userId
        );

        liked =
            true;

    }


    await post.save();


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

    const post =
        await Update.findById(
            postId
        );


    if (!post) {

        throw new Error(
            "Post not found."
        );

    }


    if (
        !Array.isArray(
            post.comments
        )
    ) {

        post.comments = [];

    }


    const comment = {

        userId:
            userId,

        userName:
            userName || "",

        userImage:
            userImage || "",

        text:
            text,

        createdAt:
            new Date()

    };


    post.comments.push(
        comment
    );


    await post.save();


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


    await post.save();


    return true;

};