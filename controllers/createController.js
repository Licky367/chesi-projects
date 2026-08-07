const createService = require("../services/createService");

exports.renderCreatePage = (req, res) => {
  res.render("create", { error: null, success: null });
};

exports.createInvitation = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.render("create", {
        error: "Email and role are required",
        success: null,
      });
    }

    await createService.createInvitation({ email, role });

    res.render("create", {
      success: "Invitation created successfully",
      error: null,
    });

  } catch (error) {
    res.render("create", {
      error: error.message,
      success: null,
    });
  }
};