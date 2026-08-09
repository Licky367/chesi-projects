// ==========================================================
// routes/networth.js
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const networthController =
    require("../controllers/networthController");


// ==========================================================
// UPLOAD MIDDLEWARE
// ==========================================================
//
// IMPORTANT:
//
// The middleware exports the multer instance:
//
//     module.exports = upload;
//
// Therefore:
//
//     upload.single("profileImage")
//
// must run BEFORE the controller whenever the form can
// contain a profile image.
//
// Your EJS uses:
//
//     name="profileImage"
//
// so the field name MUST remain exactly:
//
//     profileImage
//
// ==========================================================

const upload =
    require("../middleware/uploadMidleware");


// ==========================================================
// GET /networth
//
// NET WORTH OVERVIEW
// ==========================================================

router.get(
    "/",
    networthController.getNetWorth
);


// ==========================================================
// GET /networth/data
//
// JSON NET WORTH DATA
// ==========================================================

router.get(
    "/data",
    networthController.getNetWorthData
);


// ==========================================================
// GET /networth/structure/:id
//
// DAIRY FARM / STRUCTURE DETAILS
// ==========================================================

router.get(
    "/structure/:id",
    networthController.getDairyFarm
);


// ==========================================================
// GET /networth/structure/:id/data
//
// JSON DAIRY FARM DATA
// ==========================================================

router.get(
    "/structure/:id/data",
    networthController.getDairyFarmData
);


// ==========================================================
// GET /networth/structure/:id/add
//
// ADD ASSET PAGE
// ==========================================================

router.get(
    "/structure/:id/add",
    networthController.getAddAsset
);


// ==========================================================
// POST /networth/structure/:id/add
//
// CREATE ASSET
// ==========================================================
//
// The add form may contain:
//
//     profileImage
//     name
//     type
//     description
//     condition
//     location
//     buyingPrice
//     currentWorth
//     status
//     valuationDate
//
// multer MUST execute first.
//
// ==========================================================

router.post(
    "/structure/:id/add",

    upload.single(
        "profileImage"
    ),

    networthController.addAsset
);


// ==========================================================
// GET /networth/asset/:id
//
// ASSET DETAILS / EDIT PAGE
// ==========================================================

router.get(
    "/asset/:id",
    networthController.getAsset
);


// ==========================================================
// POST /networth/asset/:id
//
// UPDATE EXISTING ASSET
// ==========================================================
//
// IMPORTANT:
//
// Your EJS uses:
//
//     method="POST"
//
//     enctype="multipart/form-data"
//
//     <input
//         type="hidden"
//         name="_method"
//         value="PUT"
//     >
//
// The actual HTTP request is therefore POST unless you have
// configured method-override globally.
//
// This route intentionally uses POST because it matches the
// form action:
//
//     /networth/asset/<%= dairy._id %>
//
// multer processes the multipart request first.
//
// It places:
//
//     req.body
//
// and:
//
//     req.file
//
// onto the request before updateAsset executes.
//
// ==========================================================

router.post(
    "/asset/:id",

    upload.single(
        "profileImage"
    ),

    networthController.updateAsset
);


// ==========================================================
// OPTIONAL PUT SUPPORT
// ==========================================================
//
// If another client sends a genuine PUT multipart request,
// this route supports it too.
//
// This is useful if you later use fetch() with:
//
//     method: "PUT"
//
// while still sending:
//
//     FormData
//
// ==========================================================

router.put(
    "/asset/:id",

    upload.single(
        "profileImage"
    ),

    networthController.updateAsset
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;