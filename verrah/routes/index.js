const express = require("express");

const router = express.Router();

const indexController =
    require("../controllers/indexController");


/* ========================================================
   HOME PAGE
======================================================== */

router.get(
    "/",
    indexController.getHome
);


/* ========================================================
   GUIDE
======================================================== */

/* --------------------------------------------------------
   GUIDE PAGE
-------------------------------------------------------- */

router.get(
    "/guide",
    (req, res) => {

        return res.render(
            "guide",
            {
                title:
                    "Guide | Verrah Cosmetics",

                currentUser:
                    req.session?.user || null
            }
        );

    }
);


/* ========================================================
   SERVICES
======================================================== */

/* --------------------------------------------------------
   ADD SERVICE
-------------------------------------------------------- */

router.get(
    "/services/add",
    indexController.getAddService
);


router.post(
    "/services/add",
    indexController.createService
);


/* --------------------------------------------------------
   EDIT SERVICE
-------------------------------------------------------- */

router.get(
    "/services/add/:id",
    indexController.getEditService
);


router.post(
    "/services/add/:id",
    indexController.updateService
);


/* --------------------------------------------------------
   VIEW SERVICE
-------------------------------------------------------- */

router.get(
    "/services/:id",
    indexController.getService
);


/* ========================================================
   EXPORT
======================================================== */

module.exports = router;