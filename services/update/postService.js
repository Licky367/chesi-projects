// ==========================================================
// services/update/postService.js
// ==========================================================

const Update = require("../../models/Update");

const {
  formatComment
} = require("./helpers");


/* ==========================================================
   🟦 CREATE POST
========================================================= */
exports.createPost = async ({

  dairyId,

  userId,

  userName,

  text,

  image

}) => {

  return await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "post",

    text: text || "",

    image: image || null,

    likes: [],

    comments: []

  });

};


/* ==========================================================
   🟦 LIKE / UNLIKE POST
========================================================= */
exports.toggleLike = async ({

  postId,

  userId

}) => {

  const post = await Update.findById(postId);

  if (!post) {

    throw new Error(

      "Post not found."

    );

  }

  if (!Array.isArray(post.likes)) {

    post.likes = [];

  }

  const index = post.likes.findIndex(

    id => id.toString() === userId.toString()

  );

  let liked = false;

  if (index >= 0) {

    post.likes.splice(index, 1);

    liked = false;

  } else {

    post.likes.push(userId);

    liked = true;

  }

  await post.save();

  return {

    liked,

    likes: post.likes.length

  };

};


/* ==========================================================
   🟦 ADD COMMENT TO POST
========================================================= */
exports.addPostComment = async ({

  postId,

  userId,

  userName,

  userImage = "",

  text

}) => {

  const post = await Update.findById(postId);

  if (!post) {

    throw new Error(

      "Post not found."

    );

  }

  if (!Array.isArray(post.comments)) {

    post.comments = [];

  }

  const comment = {

    userId,

    userName,

    userImage,

    text,

    createdAt: new Date()

  };

  post.comments.push(comment);

  await post.save();

  return formatComment(comment);

};


/* ==========================================================
   🗑 DELETE POST
========================================================= */
exports.deletePost = async ({

  postId,

  user

}) => {

  const post = await Update.findById(postId);

  if (!post) {

    throw new Error(

      "Post not found."

    );

  }

  const owner =

    post.user &&

    post.user.toString() ===

    user._id.toString();

  const admin =

    user.role === "admin";

  if (!owner && !admin) {

    throw new Error(

      "Not authorized."

    );

  }

  await Update.findByIdAndDelete(postId);

  return true;

};


/* ==========================================================
   🗑 DELETE COMMENT
========================================================= */
exports.deleteComment = async ({

  commentId,

  user

}) => {

  const post = await Update.findOne({

    "comments._id": commentId

  });

  if (!post) {

    throw new Error(

      "Comment not found."

    );

  }

  const comment = post.comments.find(

    c => c._id.toString() === commentId.toString()

  );

  if (!comment) {

    throw new Error(

      "Comment not found."

    );

  }

  const owner =

    comment.userId &&

    user._id &&

    comment.userId.toString() ===

    user._id.toString();

  const admin =

    user.role === "admin";

  if (!owner && !admin) {

    throw new Error(

      "Not authorized."

    );

  }

  post.comments = post.comments.filter(

    c => c._id.toString() !== commentId.toString()

  );

  await post.save();

  return true;

};