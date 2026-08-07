const newService = require("../services/newService");

// =========================
// SHOW FORM
// =========================
exports.showForm = (req, res) => {
  res.render("new");
};

// =========================
// CREATE NEW RECORD
// =========================
exports.createRecord = async (req, res) => {
  try {
    const { name, dateOfBirth, code, mass } = req.body;

    // uploaded file path
    let profileImage = "";
    if (req.file) {
      profileImage = "/uploads/" + req.file.filename;
    }

    await newService.createDairyRecord({
      name,
      profileImage,
      dateOfBirth,
      code,
      mass
    });

    res.redirect("/new");
  } catch (error) {
    console.error("Create Dairy Record Error:", error.message);

    res.status(400).send(`
      <h2>Error Creating Dairy Record</h2>
      <p>${error.message}</p>
      <a href="/dairy/new">Go Back</a>
    `);
  }
};