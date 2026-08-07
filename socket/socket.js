const updateService = require('../services/update');

module.exports = function (io) {

  io.on('connection', (socket) => {

    console.log('🔌 User connected:', socket.id);


    /* =========================
       SET USER CONTEXT
    ========================= */
    socket.on('setUser', (user) => {
      socket.user = user;
    });


    /* =========================
       JOIN ROOM
    ========================= */
    socket.on('joinDairy', (dairyId) => {
      if (!dairyId) return;
      socket.join(dairyId);
    });


    /* =========================================================
       🟦 CREATE POST
    ========================================================= */
    socket.on('createPost', async ({ dairyId, text, image }) => {
      try {

        const user = socket.user;
        if (!user || !dairyId) return;

        const post = await updateService.createPost({
          dairyId,
          userId: user._id,
          userName: user.name,
          text,
          image
        });

        io.to(dairyId).emit('postCreated', {
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
        });

      } catch (err) {
        console.error('createPost error:', err.message);
      }
    });


    /* =========================================================
       👍 LIKE POST
    ========================================================= */
    socket.on('likePost', async ({ postId, dairyId }) => {
      try {

        const user = socket.user;
        if (!user) return;

        const result = await updateService.toggleLike({
          postId,
          userId: user._id
        });

        io.to(dairyId).emit('postLiked', {
          postId,
          likes: result.likes
        });

      } catch (err) {
        console.error('likePost error:', err.message);
      }
    });


    /* =========================================================
       💬 POST COMMENT
    ========================================================= */
    socket.on('postComment', async ({ postId, dairyId, text }) => {
      try {

        const user = socket.user;
        if (!user || !text) return;

        const comment = await updateService.addPostComment({
          postId,
          userId: user._id,
          userName: user.name,
          text
        });

        io.to(dairyId).emit('postCommentAdded', {
          postId,
          comment: {
            ...comment,
            userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
            dateText: new Date(comment.createdAt).toLocaleString()
          }
        });

      } catch (err) {
        console.error('postComment error:', err.message);
      }
    });


    /* =========================================================
       🗑 DELETE POST
    ========================================================= */
    socket.on('deletePost', async ({ postId, dairyId }) => {
      try {

        const user = socket.user;
        if (!user) return;

        const ok = await updateService.deletePost({
          postId,
          user
        });

        if (!ok) return;

        io.to(dairyId).emit('postDeleted', { postId });

      } catch (err) {
        console.error('deletePost error:', err.message);
      }
    });


    /* =========================================================
       ❌ DELETE COMMENT
    ========================================================= */
    socket.on('deleteComment', async ({ commentId, postId, dairyId }) => {
      try {

        const user = socket.user;
        if (!user) return;

        const ok = await updateService.deleteComment({
          commentId,
          user
        });

        if (!ok) return;

        io.to(dairyId).emit('commentDeleted', {
          commentId,
          postId
        });

      } catch (err) {
        console.error('deleteComment error:', err.message);
      }
    });


    /* =========================================================
       🟨 IMAGE UPDATE
    ========================================================= */
    socket.on('imageUpdated', ({ dairyId, image }) => {
      if (!dairyId || !image) return;

      io.to(dairyId).emit('imageChanged', { image });
    });


    /* =========================================================
       🟥 MEDICAL MARK (REAL FLOW)
    ========================================================= */
    socket.on('medicalMark', async ({ dairyId, type, details }) => {
      try {

        const user = socket.user;
        if (!user || !dairyId) return;

        const update = await updateService.markMedicalAttention({
          dairyId,
          userId: user._id,
          type,
          details
        });

        io.to(dairyId).emit('medicalMarked', {
          dairyId,
          status: 'marked',
          type,
          details,
          userName: user.name,
          userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
          dateText: new Date(update.medical.markedAt).toLocaleString()
        });

      } catch (err) {
        console.error('medicalMark error:', err.message);
      }
    });


    /* =========================================================
       🟪 MEDICAL UNMARK (REAL FLOW)
    ========================================================= */
    socket.on('medicalUnmark', async ({ dairyId, charges, description }) => {
      try {

        const user = socket.user;
        if (!user || !dairyId) return;

        const update = await updateService.unmarkMedicalAttention({
          dairyId,
          userId: user._id,
          charges,
          description
        });

        io.to(dairyId).emit('medicalUnmarked', {
          dairyId,
          status: 'cleared',
          charges,
          description,
          clearedBy: user.name,
          dateText: new Date(update.createdAt).toLocaleString()
        });

      } catch (err) {
        console.error('medicalUnmark error:', err.message);
      }
    });


    /* =========================================================
       🟩 MAINTENANCE MARK
    ========================================================= */
    socket.on('maintenanceMark', async ({ dairyId, type, description }) => {
      try {

        const user = socket.user;
        if (!user || !dairyId) return;

        const update = await updateService.markMaintenance({
          dairyId,
          userId: user._id,
          type,
          description
        });

        io.to(dairyId).emit('maintenanceMarked', {
          dairyId,
          status: 'marked',
          type,
          description,
          userName: user.name,
          userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
          dateText: new Date(update.createdAt).toLocaleString()
        });

      } catch (err) {
        console.error('maintenanceMark error:', err.message);
      }
    });


    /* =========================================================
       🟦 MAINTENANCE CLEAR
    ========================================================= */
    socket.on('maintenanceClear', async ({ dairyId, charges, description }) => {
      try {

        const user = socket.user;
        if (!user || !dairyId) return;

        const update = await updateService.clearMaintenance({
          dairyId,
          userId: user._id,
          charges,
          description
        });

        io.to(dairyId).emit('maintenanceCleared', {
          dairyId,
          status: 'cleared',
          charges,
          description,
          userName: user.name,
          dateText: new Date(update.createdAt).toLocaleString()
        });

      } catch (err) {
        console.error('maintenanceClear error:', err.message);
      }
    });


    /* =========================
       LEGACY COMMENT
    ========================= */
    socket.on('newComment', async ({ dairyId, comment }) => {
      try {

        const user = socket.user;
        if (!user || !comment) return;

        const saved = await updateService.addComment({
          dairyId,
          userId: user._id,
          comment
        });

        io.to(dairyId).emit('commentAdded', {
          _id: saved._id,
          comment: saved.comment,
          userName: user.name,
          userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
          dateText: new Date(saved.createdAt).toLocaleString()
        });

      } catch (err) {
        console.error('legacy comment error:', err.message);
      }
    });


    /* =========================
       DISCONNECT
    ========================= */
    socket.on('disconnect', () => {
      console.log('❌ Disconnected:', socket.id);
    });

  });

};