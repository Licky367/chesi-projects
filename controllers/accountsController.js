// ==========================================================
// controllers/accountsController.js
// ==========================================================

const accountsService =
  require("../services/accountsService");


// ==========================================================
// USERS LIST
// ==========================================================

exports.getAccountsPage =
async (req, res) => {

  try {

    const users =
      await accountsService.getAllUsers();


    res.render("accounts", {

      title: "All Users",

      users

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

exports.getAccountProfile =
async (req, res) => {

  try {

    const data =
      await accountsService
        .getUserProfileData(
          req.params.id
        );


    if (!data.user) {

      return res.status(404).send(
        "User not found"
      );

    }


    res.render(
      "accountsProfile",
      {

        title: data.user.name,

        user: data.user,

        dairies: data.dairies,

        currentUser: req.user

      }
    );

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

exports.updateUserRole =
async (req, res) => {

  try {

    if (
      req.user._id.toString() ===
      req.params.id
    ) {

      return res.status(403).send(
        "You cannot change your own role."
      );

    }


    await accountsService.updateUserRole(

      req.params.id,

      req.body.role

    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message ||
      "Failed to update role"
    );

  }

};


// ==========================================================
// ASSIGN DAIRY FARMS
// ==========================================================

exports.assignDairyFarms =
async (req, res) => {

  try {

    let {
      assignedFarms
    } = req.body;


    if (
      !assignedFarms
    ) {

      return res.redirect(
        `/accounts/${req.params.id}`
      );

    }


    if (
      !Array.isArray(assignedFarms)
    ) {

      assignedFarms = [
        assignedFarms
      ];

    }


    await accountsService.assignDairyFarms(

      req.params.id,

      assignedFarms

    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message ||
      "Failed to assign Dairy Farms"
    );

  }

};


// ==========================================================
// UNASSIGN DAIRY FARM
// ==========================================================

exports.unassignDairyFarm =
async (req, res) => {

  try {

    await accountsService.unassignDairyFarm(

      req.params.id,

      req.body.farmId

    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message ||
      "Failed to unassign Dairy Farm"
    );

  }

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser =
async (req, res) => {

  try {

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