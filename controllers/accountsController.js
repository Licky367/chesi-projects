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


    res.render(
      "accounts",
      {

        title: "All Users",

        users

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

        assets: data.assets,

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
      !Array.isArray(
        assignedFarms
      )
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

      req.params.farmId

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
// ASSIGN STANDALONE ASSETS
// ==========================================================
//
// REQUEST FIELD:
//
//     assignedAssets
//
// USER FIELD:
//
//     assignedAsset
//
// ==========================================================

exports.assignDairyAssets =
async (req, res) => {

  try {

    let {
      assignedAssets
    } = req.body;


    if (
      !assignedAssets
    ) {

      return res.redirect(
        `/accounts/${req.params.id}`
      );

    }


    if (
      !Array.isArray(
        assignedAssets
      )
    ) {

      assignedAssets = [
        assignedAssets
      ];

    }


    await accountsService.assignDairyAssets(

      req.params.id,

      assignedAssets

    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message ||
      "Failed to assign assets"
    );

  }

};


// ==========================================================
// UNASSIGN STANDALONE ASSET
// ==========================================================

exports.unassignDairyAsset =
async (req, res) => {

  try {

    await accountsService.unassignDairyAsset(

      req.params.id,

      req.params.assetId

    );


    res.redirect(
      `/accounts/${req.params.id}`
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message ||
      "Failed to unassign asset"
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
      err.message ||
      "Failed to delete account"
    );

  }

};