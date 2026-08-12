// ==========================================================
// controllers/accountsController.js
// ==========================================================

const accountsService =
  require("../services/accountsService");


// ==========================================================
// USERS LIST
// ==========================================================

exports.getAccountsPage = async (req, res) => {

  try {

    const users =
      await accountsService.getAllUsers();


    res.render("accounts", {

      title: "All Users",

      users,

    });

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Server Error"
    );

  }

};


// ==========================================================
// USER PROFILE
// ==========================================================

exports.getAccountProfile = async (req, res) => {

  try {

    const {
      user,
      dairies
    } =
      await accountsService.getUserProfileData(
        req.params.id
      );


    if (!user) {

      return res.status(404).send(
        "User not found"
      );

    }


    res.render("accountsProfile", {

      title: user.name,

      user,

      dairies,

      currentUser: req.user,

    });

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Server Error"
    );

  }

};


// ==========================================================
// UPDATE ROLE
// ==========================================================

exports.updateUserRole = async (req, res) => {

  try {

    // --------------------------------------------------------
    // Prevent changing your own role
    // --------------------------------------------------------

    if (
      req.user._id.toString() ===
      req.params.id
    ) {

      return res.status(403).send(
        "You cannot change your own role."
      );

    }


    const { role } =
      req.body;


    await accountsService.updateUserRole(
      req.params.id,
      role
    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Failed to update role"
    );

  }

};


// ==========================================================
// ASSIGN ADDITIONAL DAIRY FARMS
// ==========================================================

exports.assignDairyFarms = async (req, res) => {

  try {

    const userId =
      req.params.id;


    let { assignedFarms } =
      req.body;


    // --------------------------------------------------------
    // If only one farm was submitted, Express may give us
    // a string instead of an array.
    // Normalize it to an array.
    // --------------------------------------------------------

    if (!assignedFarms) {

      return res.redirect(
        `/accounts/${userId}`
      );

    }


    if (!Array.isArray(assignedFarms)) {

      assignedFarms = [
        assignedFarms
      ];

    }


    await accountsService.assignDairyFarms(
      userId,
      assignedFarms
    );


    res.redirect(
      `/accounts/${userId}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Failed to assign Dairy Farms"
    );

  }

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser = async (req, res) => {

  try {

    // --------------------------------------------------------
    // Prevent deleting your own account
    // --------------------------------------------------------

    if (
      req.user._id.toString() ===
      req.params.id
    ) {

      return res.status(403).send(
        "You cannot delete your own account."
      );

    }


    await accountsService.deleteUser(
      req.params.id
    );


    res.redirect(
      "/accounts"
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Failed to delete account"
    );

  }

};