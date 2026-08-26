// ==========================================================
// controllers/networthController.js
// ==========================================================
//
// NET WORTH CONTROLLER
//
// ROUTES:
//
//     GET  /networth
//     GET  /networth/structure/:id
//     GET  /networth/structure/:id/add
//     POST /networth/structure/:id/add
//     GET  /networth/asset/:id
//     POST /networth/asset/:id
//     GET  /networth/data
//     GET  /networth/structure/:id/data
//
// ==========================================================
//
// DATA MODEL
// ----------------------------------------------------------
//
// models/dairy.js is the source of truth for Dairy assets.
//
// CODE:
//
//     code < 0
//         = Dairy Farm
//
//     code > 0
//         = identified animal
//
//     code === null / undefined
//         = structure / facility / equipment / standalone asset
//
// ASSET CODE:
//
//     assetCode
//         = parent Dairy Farm code
//
// USER ASSIGNMENT:
//
//     User.assignedAsset
//         = Dairy._id
//
// IMPORTANT:
//
// Assignment is NOT stored on the Dairy document.
//
// The relationship is:
//
//     User.assignedAsset -> Dairy._id
//
// Therefore the controller determines the current assigned
// user by querying the User collection.
//
// ==========================================================


const networthService =
    require("../services/networthService");


const User =
    require("../models/projectUser");


// ==========================================================
// DETERMINE WHETHER CLIENT EXPECTS JSON
// ==========================================================

function wantsJSON(req) {

    return (

        req.xhr === true ||

        (
            typeof req.headers.accept === "string" &&
            req.headers.accept.includes(
                "application/json"
            )
        )

    );

}


// ==========================================================
// RENDER ERROR
// ==========================================================

function renderError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .render(
            "error",
            {

                message:
                    error.message ||
                    fallbackMessage,

                statusCode

            }
        );

}


// ==========================================================
// JSON ERROR
// ==========================================================

function jsonError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .json(
            {

                success: false,

                message:
                    error.message ||
                    fallbackMessage

            }
        );

}


// ==========================================================
// BUILD IMAGE URL
// ==========================================================
//
// multer:
//
//     public/uploads/<filename>
//
// browser:
//
//     /uploads/<filename>
//
// ==========================================================

function getUploadedImageUrl(file) {

    if (!file) {

        return null;

    }


    if (file.filename) {

        return `/uploads/${file.filename}`;

    }


    return null;

}


// ==========================================================
// REMOVE PROTECTED DAIRY FIELDS
// ==========================================================
//
// These fields are controlled by the application.
//
// NEVER accept them from the browser during an ordinary
// asset update.
//
// ==========================================================

function removeProtectedAssetFields(data) {

    if (!data) {

        return {};

    }


    delete data._id;

    delete data.code;

    delete data.assetCode;

    delete data.__v;

    delete data.createdAt;

    delete data.updatedAt;


    return data;

}


// ==========================================================
// NORMALIZE BOOLEAN
// ==========================================================

function normalizeBoolean(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return false;

    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    return (

        normalized === "true" ||

        normalized === "1" ||

        normalized === "yes" ||

        normalized === "on"

    );

}


// ==========================================================
// NORMALIZE TEXT
// ==========================================================

function normalizeText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


// ==========================================================
// NORMALIZE STRUCTURE FIELDS
// ==========================================================
//
// These fields belong to unnumbered Dairy records:
//
//     about
//     mission
//     refNo
//     vision
//
// ==========================================================

function normalizeStructureFields(data) {

    if (!data) {

        return data;

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "about"
        )
    ) {

        data.about =
            normalizeText(
                data.about
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "mission"
        )
    ) {

        data.mission =
            normalizeText(
                data.mission
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "refNo"
        )
    ) {

        data.refNo =
            normalizeText(
                data.refNo
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "vision"
        )
    ) {

        data.vision =
            normalizeText(
                data.vision
            );

    }


    return data;

}


// ==========================================================
// NORMALIZE ASSIGNED USER ID
// ==========================================================
//
// Form:
//
//     assignedUserId
//
// Empty:
//
//     null
//
// Non-empty:
//
//     ObjectId string
//
// ==========================================================

function normalizeAssignedUserId(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    const normalized =
        String(value).trim();


    if (!normalized) {

        return null;

    }


    return normalized;

}


// ==========================================================
// GET AVAILABLE USERS
// ==========================================================
//
// Assignment dropdown:
//
//     admin
//         excluded
//
//     every other project user
//         included
//
// ==========================================================

async function getAvailableAssignmentUsers() {

    return User
        .find(
            {
                role: {
                    $ne: "admin"
                }
            },
            {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
                assignedAsset: 1
            }
        )
        .sort(
            {
                name: 1,
                email: 1
            }
        )
        .lean();

}


// ==========================================================
// GET CURRENT ASSIGNED USER
// ==========================================================
//
// THIS IS THE IMPORTANT FIX.
//
// We DO NOT use:
//
//     currentAssignedUser
//
// from the EJS.
//
// We DO NOT assume:
//
//     assignedUser
//
// is supplied by networthService.
//
// Instead:
//
//     User.assignedAsset === Dairy._id
//
// identifies the current assigned user.
//
// ==========================================================

async function getCurrentAssignedUser(
    dairyId
) {

    if (!dairyId) {

        return null;

    }


    return User
        .findOne(
            {
                assignedAsset: dairyId
            },
            {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
                assignedAsset: 1
            }
        )
        .lean();

}


// ==========================================================
// GET /networth
// ==========================================================

async function getNetWorth(
    req,
    res
) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.render(
            "networth",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to load Net Worth."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Net Worth."
        );

    }

}


// ==========================================================
// GET /networth/structure/:id
// ==========================================================

async function getDairyFarm(
    req,
    res
) {

    try {

        const data =
            await networthService.getDairyFarm(
                req.params.id
            );


        return res.render(
            "networth-structures",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Dairy Farm:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to load Dairy Farm."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Dairy Farm."
        );

    }

}


// ==========================================================
// GET /networth/structure/:id/add
// ==========================================================

async function getAddAsset(
    req,
    res
) {

    try {

        const data =
            await networthService.getAddAsset(
                req.params.id
            );


        return res.render(
            "networth-add",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Add Asset page:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to load Add Asset page."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Add Asset page."
        );

    }

}


// ==========================================================
// POST /networth/structure/:id/add
// ==========================================================
//
// CREATE ASSET.
//
// code and assetCode remain system controlled.
//
// ==========================================================

async function addAsset(
    req,
    res
) {

    try {

        const dairyFarmId =
            req.params.id;


        const body =
            {
                ...(req.body || {})
            };


        delete body._method;


        removeProtectedAssetFields(
            body
        );


        normalizeStructureFields(
            body
        );


        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (uploadedImage) {

            body.profileImage =
                uploadedImage;

        }


        if (
            body.isMilking !== undefined
        ) {

            body.isMilking =
                normalizeBoolean(
                    body.isMilking
                );

        }


        const asset =
            await networthService.addAsset(
                dairyFarmId,
                body,
                req.file || null
            );


        if (wantsJSON(req)) {

            const netWorth =
                await networthService.getNetWorth();


            return res.json(
                {

                    success: true,

                    message:
                        "Asset created successfully.",

                    asset,

                    netWorth

                }
            );

        }


        return res.redirect(
            `/networth/structure/${dairyFarmId}`
        );

    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to add asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to add asset."
        );

    }

}


// ==========================================================
// GET /networth/asset/:id
// ==========================================================
//
// :id = Dairy._id
//
// IMPORTANT:
//
// Current assignment is resolved from:
//
//     User.assignedAsset
//
// not from the Dairy document.
//
// ==========================================================

async function getAsset(
    req,
    res
) {

    try {

        const dairyId =
            req.params.id;


        // ------------------------------------------------------
        // LOAD ASSET
        // ------------------------------------------------------

        const data =
            await networthService.getAsset(
                dairyId
            );


        // ------------------------------------------------------
        // LOAD ALL NON-ADMIN USERS
        // ------------------------------------------------------

        const availableUsers =
            await getAvailableAssignmentUsers();


        // ------------------------------------------------------
        // FIND CURRENT USER FROM users.assignedAsset
        // ------------------------------------------------------

        const assignedUser =
            await getCurrentAssignedUser(
                dairyId
            );


        // ------------------------------------------------------
        // NORMALIZE VIEW VARIABLES
        // ------------------------------------------------------
        //
        // The EJS only needs:
        //
        //     availableUsers
        //
        //     assignedUser
        //
        // It does NOT need:
        //
        //     currentAssignedUser
        //
        // ------------------------------------------------------

        data.availableUsers =
            availableUsers;


        data.assignedUser =
            assignedUser;


        // ------------------------------------------------------
        // RENDER
        // ------------------------------------------------------

        return res.render(
            "networth-asset",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth asset:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to load asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load asset."
        );

    }

}


// ==========================================================
// POST /networth/asset/:id
// ==========================================================
//
// UPDATE ASSET
//
// Dairy fields:
//
//     name
//     type
//     dateOfBirth
//     mass
//     isMilking
//     buyingPrice
//     currentWorth
//     valuationDate
//     description
//     condition
//     location
//     status
//     about
//     mission
//     refNo
//     vision
//     profileImage
//
// Protected Dairy fields:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// User assignment:
//
//     assignedUserId
//
// is NOT a Dairy field.
//
// It updates:
//
//     User.assignedAsset
//
// ==========================================================

async function updateAsset(
    req,
    res
) {

    try {

        const dairyId =
            req.params.id;


        // ======================================================
        // COPY FORM DATA
        // ======================================================

        const updateData =
            {
                ...(req.body || {})
            };


        delete updateData._method;


        // ======================================================
        // READ ASSIGNMENT BEFORE REMOVING OTHER FIELDS
        // ======================================================
        //
        // assignedUserId belongs to the User collection.
        //
        // It must NOT be sent to Dairy.update().
        //
        // ======================================================

        const hasAssignmentField =
            Object.prototype.hasOwnProperty.call(
                updateData,
                "assignedUserId"
            );


        const requestedAssignedUserId =
            hasAssignmentField
                ? normalizeAssignedUserId(
                    updateData.assignedUserId
                )
                : undefined;


        delete updateData.assignedUserId;


        // ======================================================
        // REMOVE PROTECTED DAIRY FIELDS
        // ======================================================

        removeProtectedAssetFields(
            updateData
        );


        // ======================================================
        // PROFILE IMAGE
        // ======================================================

        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (uploadedImage) {

            updateData.profileImage =
                uploadedImage;

        }


        // ======================================================
        // MILKING
        // ======================================================

        if (
            updateData.isMilking !== undefined
        ) {

            updateData.isMilking =
                normalizeBoolean(
                    updateData.isMilking
                );

        }


        // ======================================================
        // STRUCTURE FIELDS
        // ======================================================

        normalizeStructureFields(
            updateData
        );


        // ======================================================
        // UPDATE DAIRY RECORD
        // ======================================================

        const updatedAsset =
            await networthService.updateAsset(
                dairyId,
                updateData
            );


        // ======================================================
        // UPDATE USER ASSIGNMENT
        // ======================================================
        //
        // Only do this when the form actually submitted
        // assignedUserId.
        //
        // Therefore:
        //
        // assignedUserId missing
        //     = do not change assignment
        //
        // assignedUserId empty
        //     = remove assignment
        //
        // assignedUserId contains ObjectId
        //     = assign this Dairy to that user
        //
        // ======================================================

        if (hasAssignmentField) {

            // --------------------------------------------------
            // REMOVE THIS DAIRY FROM EVERY USER
            // --------------------------------------------------
            //
            // This prevents the same standalone asset from
            // remaining assigned to multiple users.
            //
            // --------------------------------------------------

            await User.updateMany(
                {
                    assignedAsset: dairyId
                },
                {
                    $set: {
                        assignedAsset: null
                    }
                }
            );


            // --------------------------------------------------
            // ASSIGN TO SELECTED USER
            // --------------------------------------------------

            if (requestedAssignedUserId) {

                const selectedUser =
                    await User.findOne(
                        {
                            _id:
                                requestedAssignedUserId,

                            role: {
                                $ne: "admin"
                            }
                        },
                        {
                            _id: 1,
                            role: 1
                        }
                    );


                if (!selectedUser) {

                    const error =
                        new Error(
                            "Selected user does not exist or is an admin."
                        );

                    error.statusCode = 400;

                    throw error;

                }


                // ------------------------------------------------
                // IMPORTANT:
                //
                // A user can now receive this Dairy asset.
                //
                // User.assignedAsset stores the Dairy._id.
                // ------------------------------------------------

                await User.updateOne(
                    {
                        _id:
                            selectedUser._id
                    },
                    {
                        $set: {
                            assignedAsset:
                                dairyId
                        }
                    }
                );

            }

        }


        // ======================================================
        // REFRESH NET WORTH
        // ======================================================

        const netWorth =
            await networthService.getNetWorth();


        // ======================================================
        // JSON RESPONSE
        // ======================================================

        if (wantsJSON(req)) {

            return res.json(
                {

                    success: true,

                    message:
                        "Asset updated successfully.",

                    asset:
                        updatedAsset,

                    netWorth

                }
            );

        }


        // ======================================================
        // NORMAL FORM SUBMISSION
        // ======================================================

        return res.redirect(
            `/networth/asset/${dairyId}`
        );

    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        if (wantsJSON(req)) {

            return jsonError(
                res,
                error,
                "Unable to update asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to update asset."
        );

    }

}


// ==========================================================
// GET /networth/data
// ==========================================================

async function getNetWorthData(
    req,
    res
) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.json(
            {

                success: true,

                ...data

            }
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth data:",
            error
        );


        return jsonError(
            res,
            error,
            "Unable to load Net Worth data."
        );

    }

}


// ==========================================================
// GET /networth/structure/:id/data
// ==========================================================

async function getDairyFarmData(
    req,
    res
) {

    try {

        const data =
            await networthService.getDairyFarm(
                req.params.id
            );


        return res.json(
            {

                success: true,

                ...data

            }
        );

    } catch (error) {

        console.error(
            "Error loading Dairy Farm data:",
            error
        );


        return jsonError(
            res,
            error,
            "Unable to load Dairy Farm data."
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset,

    getNetWorthData,

    getDairyFarmData

};