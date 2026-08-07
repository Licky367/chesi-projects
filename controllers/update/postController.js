const updateService = require("../../services/update");

/* =========================================================
   🟦 CREATE POST
========================================================= */
exports.createPost = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const text = req.body.text?.trim();
    const image = req.file?.filename || null;

    if (!text && !image) {
      return res
        .status(400)
        .send("Post text or image required");
    }

    const post = await updateService.createPost({
      dairyId: id,
      userId: user._id,
      userName: user.name,
      text,
      image
    });

    const payload = {
      _id: post._id,
      userId: user._id,
      userName: user.name,
      userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      text: post.text,
      image: post.image,
      likes: 0,
      comments: [],
      createdAt: post.createdAt,
      dateText: new Date(post.createdAt).toLocaleString()
    };

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit("postCreated", payload);
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "CREATE POST ERROR:",
      err.message
    );

    res
      .status(500)
      .send("Failed to create post");

  }
};


/* =========================================================
   🟦 LIKE / UNLIKE POST
========================================================= */
exports.likePost = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const result = await updateService.toggleLike({
      postId: id,
      userId: user._id
    });

    const io = req.app.get("io");

    if (io) {
      io.to(req.body.dairyId || "all").emit(
        "postLiked",
        {
          postId: id,
          likes: result.likes,
          liked: result.liked
        }
      );
    }

    return res.json({
      success: true,
      liked: result.liked,
      likes: result.likes
    });

  } catch (err) {

    console.error(
      "LIKE POST ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to like post"
    });

  }
};


/* =========================================================
   🟦 ADD COMMENT TO POST
========================================================= */
exports.addPostComment = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const text = req.body.text?.trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment text required"
      });
    }

    const comment = await updateService.addPostComment({
      postId: id,
      userId: user._id,
      userName: user.name,
      text
    });

    const payload = {
      success: true,
      postId: id,
      comment: {
        _id: comment._id,
        userId: user._id,
        userName: user.name,
        userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
        text: comment.text,
        dateText: new Date(comment.createdAt).toLocaleString()
      }
    };

    const io = req.app.get("io");

    if (io) {
      io.to(req.body.dairyId || "all").emit(
        "postCommentAdded",
        payload
      );
    }

    return res.json(payload);

  } catch (err) {

    console.error(
      "POST COMMENT ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add post comment"
    });

  }
};


/* =========================================================
   🗑 DELETE POST
========================================================= */
exports.deletePost = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await updateService.deletePost({
      postId: id,
      user
    });

    const io = req.app.get("io");

    if (io) {
      io.to(req.body.dairyId || "all").emit(
        "postDeleted",
        {
          postId: id
        }
      );
    }

    return res.json({
      success: true
    });

  } catch (err) {

    console.error(
      "DELETE POST ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete post"
    });

  }
};


/* =========================================================
   🗑 DELETE COMMENT
========================================================= */
exports.deleteComment = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await updateService.deleteComment({
      commentId: id,
      user
    });

    const io = req.app.get("io");

    if (io) {
      io.to(req.body.dairyId || "all").emit(
        "commentDeleted",
        {
          commentId: id,
          postId: req.body.postId
        }
      );
    }

    return res.json({
      success: true
    });

  } catch (err) {

    console.error(
      "DELETE COMMENT ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment"
    });

  }
};