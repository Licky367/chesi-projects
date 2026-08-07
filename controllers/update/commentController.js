const updateService = require("../../services/update");

/* =========================================================
   💬 GENERAL COMMENT
========================================================= */
exports.comment = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const text = req.body.comment?.trim();

    if (!text) {
      return res.status(400).send("Comment is required");
    }

    const comment = await updateService.comment({
      dairyId: id,
      userId: user._id,
      userName: user.name,
      text
    });

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit("commentAdded", {
        dairyId: id,
        comment: {
          _id: comment._id,
          userId: user._id,
          userName: user.name,
          text: comment.text,
          createdAt: comment.createdAt
        }
      });
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "COMMENT ERROR:",
      err.message
    );

    res
      .status(500)
      .send("Failed to add comment");

  }
};