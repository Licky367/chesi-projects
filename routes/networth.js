const express = require("express");

const router =
    express.Router();


const networthController =
    require(
        "../controllers/networthController"
    );


/* =========================================================
   NET WORTH DASHBOARD

   GET /networth

   Displays the complete Net Worth overview.
========================================================= */

router.get(
    "/",
    networthController.getNetWorth
);


/* =========================================================
   STRUCTURE DETAILS

   GET /networth/structure/:id

   :id is the MongoDB _id of the Dairy structure.

   The structure itself must have:

       code < 0
========================================================= */

router.get(
    "/structure/:id",
    networthController.getStructure
);


/* =========================================================
   ADD MANUAL ASSET TO STRUCTURE

   GET /networth/structure/:id/add

   Displays the Add Asset form.

   :id is the MongoDB _id of the parent structure.
========================================================= */

router.get(
    "/structure/:id/add",
    networthController.getAddAsset
);


/* =========================================================
   CREATE MANUAL ASSET

   POST /networth/structure/:id/add

   Creates a new Dairy record with:

       code = null
       assetSource = "asset"
       assetCode = parent structure's negative code

   The backend determines assetCode from the structure.
========================================================= */

router.post(
    "/structure/:id/add",
    networthController.addAsset
);


/* =========================================================
   ASSET DETAILS / EDIT

   GET /networth/asset/:id

   Displays an existing Dairy Net Worth record.
========================================================= */

router.get(
    "/asset/:id",
    networthController.getAsset
);


/* =========================================================
   UPDATE ASSET

   POST /networth/asset/:id

   The frontend submits:

       _method = PUT

   Therefore this route is intended to work with
   method-override middleware.
========================================================= */

router.put(
    "/asset/:id",
    networthController.updateAsset
);


module.exports =
    router;