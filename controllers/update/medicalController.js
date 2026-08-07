const updateService = require("../../services/update");

/* =========================================================
   🩺 MARK MEDICAL ATTENTION
========================================================= */
exports.markMedical = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    if (!(user.role === "admin" || user.role === "dairyWorker")) {
      return res
        .status(403)
        .send("Only admins or dairy workers can mark medical attention");
    }

    const type = req.body.type?.trim();
    const details = req.body.details?.trim();

    if (!type || !details) {
      return res
        .status(400)
        .send("Medical type and details are required");
    }

    const update = await updateService.markMedicalAttention({
      dairyId: id,
      userId: user._id,
      userName: user.name,
      type,
      details
    });

    const payload = {
      dairyId: id,
      status: "marked",
      type,
      details,
      userImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      dateText: new Date(update.createdAt).toLocaleString()
    };

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit(
        "medicalMarked",
        payload
      );
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "MEDICAL MARK ERROR:",
      err
    );

    res
      .status(500)
      .send("Failed to mark medical attention");

  }
};


/* =========================================================
   ✅ CLEAR MEDICAL ATTENTION
========================================================= */
exports.unmarkMedical = async (req, res) => {
  try {

    const { id } = req.params;
    const user = req.session.user;

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .send("Only admin can clear medical attention");
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

    const update = await updateService.unmarkMedicalAttention({
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
      dateText: new Date(update.createdAt).toLocaleString()
    };

    const io = req.app.get("io");

    if (io) {
      io.to(id).emit(
        "medicalCleared",
        payload
      );
    }

    res.redirect(`/dairy/${id}`);

  } catch (err) {

    console.error(
      "MEDICAL CLEAR ERROR:",
      err.message
    );

    res
      .status(500)
      .send("Failed to clear medical attention");

  }
};