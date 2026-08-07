const updateService = require("../../services/update");

/* =========================================================
   🔧 MARK MAINTENANCE
========================================================= */
exports.markMaintenance = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    if (!(user.role === "admin" || user.role === "dairyWorker")) {
      return res
        .status(403)
        .send("Not allowed");
    }

    const type = req.body.type?.trim();
    const description = req.body.description?.trim();

    if (!type || !description) {
      return res
        .status(400)
        .send("Maintenance type and description are required");
    }

    const update = await updateService.markMaintenance({
      dairyId: id,
      userId: user._id,
      userName: user.name,
      type,
      description
    });

    const payload = {
      dairyId: id,
      status: "marked",
      type,
      description,
      userName: user.name,
      userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      dateText: new Date(update.createdAt).toLocaleString()
    };

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit(
        "maintenanceMarked",
        payload
      );
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "MAINTENANCE MARK ERROR:",
      err.message
    );

    res
      .status(500)
      .send("Failed to mark maintenance");

  }
};


/* =========================================================
   ✅ CLEAR MAINTENANCE
========================================================= */
exports.clearMaintenance = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .send("Only admin can clear maintenance");
    }

    const charges = Number(req.body.charges);
    const description = req.body.description?.trim();

    if (isNaN(charges) || charges < 0) {
      return res
        .status(400)
        .send("Valid charges are required");
    }

    if (!description) {
      return res
        .status(400)
        .send("Description is required");
    }

    const update = await updateService.clearMaintenance({
      dairyId: id,
      userId: user._id,
      userName: user.name,
      charges,
      description
    });

    const payload = {
      dairyId: id,
      status: "cleared",
      charges,
      description,
      userName: user.name,
      userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      dateText: new Date(update.createdAt).toLocaleString()
    };

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit(
        "maintenanceCleared",
        payload
      );
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "MAINTENANCE CLEAR ERROR:",
      err.message
    );

    res
      .status(500)
      .send("Failed to clear maintenance");

  }
};