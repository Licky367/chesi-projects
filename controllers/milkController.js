const milkService =
  require("../services/milkService");

// ==================================================
// GET MILK PAGE
// ==================================================

exports.getMilkPage =
  async (req, res) => {

    try {

      const data =
        await milkService.getMilkPageData(
          req.user
        );

      return res.render(
        "milk",
        {

          dairies:
            data.dairies,

          day:
            data.day,

          session:
            data.session,

          isAdmin:
            data.isAdmin,

          user:
            req.user,

          success:
            req.query.success === "1",

          error:
            req.query.error || ""

        }
      );

    } catch (err) {

      console.error(
        "Milk page error:",
        err
      );

      return res
        .status(500)
        .send(
          "Error loading milk page"
        );

    }

  };

// ==================================================
// SUBMIT MILK
// ==================================================

exports.submitMilk =
  async (req, res) => {

    try {

      await milkService.saveMilkRecords(

        req.body.records,

        req.user?._id,

        req.user

      );

      return res.redirect(
        "/milk?success=1"
      );

    } catch (err) {

      console.error(
        "Submit milk error:",
        err
      );

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          err.message
        )
      );

    }

  };

// ==================================================
// EDIT MILK RECORD
// ADMIN ONLY
// ==================================================

exports.editMilkRecord =
  async (req, res) => {

    try {

      await milkService.editMilkRecord({

        recordId:
          req.params.id,

        liters:
          req.body.liters,

        remarks:
          req.body.remarks,

        user:
          req.user

      });

      return res.redirect(
        "/milk?success=1"
      );

    } catch (err) {

      console.error(
        "Edit milk error:",
        err
      );

      return res.redirect(
        "/milk?error=" +
        encodeURIComponent(
          err.message
        )
      );

    }

  };