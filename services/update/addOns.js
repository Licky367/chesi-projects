// ==========================================================
// services/update/addOnsService.js
// ==========================================================
//
// ADD-ONS FINANCIAL SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles:
//
//     1. Loading financial add-ons page data
//
//     2. Recording revenue
//
//     3. Recording liabilities
//
// IMPORTANT
// ----------------------------------------------------------
//
// Financial transaction types:
//
//     revenue
//
//     liability
//
// The transaction type is NEVER trusted from the client.
//
// The service determines:
//
//     - revenue → "revenue"
//     - liability → "liability"
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../models/dairy");


const Financials =
    require("../models/financials");


// ==========================================================
// GET ADD-ONS PAGE DATA
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Resolves:
//
//     dairy
//
// and returns:
//
//     {
//         dairy,
//         user
//     }
//
// The user is taken from:
//
//     req.user
//
// or:
//
//     req.session.user
//
// depending on the application's authentication structure.
//
// ==========================================================

exports.getAddOnsPageData =
async function(req) {

    // ======================================================
    // USER
    // ======================================================

    const user =
        req.user ||
        req.session?.user ||
        null;


    // ======================================================
    // DAIRY ID
    // ======================================================
    //
    // Supports:
    //
    //     req.params.id
    //
    // ======================================================

    const dairyId =
        req.params?.id;


    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!dairy) {

        const error =
            new Error(
                "Dairy record not found."
            );

        error.statusCode = 404;

        throw error;

    }


    // ======================================================
    // RETURN PAGE DATA
    // ======================================================

    return {

        dairy,

        user

    };

};


// ==========================================================
// RECORD REVENUE
// ==========================================================
//
// Creates:
//
//     type = "revenue"
//
// ==========================================================

exports.recordRevenue =
async function(

    {

        dairyId,

        amount,

        description,

        date,

        user

    }

) {

    // ======================================================
    // VALIDATE USER
    // ======================================================

    if (!user) {

        const error =
            new Error(
                "You must be logged in to record revenue."
            );

        error.statusCode = 401;

        throw error;

    }


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy record not found."
            );

        error.statusCode = 404;

        throw error;

    }


    // ======================================================
    // VALIDATE AMOUNT
    // ======================================================

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount < 0
    ) {

        const error =
            new Error(
                "Revenue amount must be a valid positive number."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE DESCRIPTION
    // ======================================================

    const cleanDescription =
        String(
            description || ""
        )
            .trim();


    if (!cleanDescription) {

        const error =
            new Error(
                "Revenue description is required."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // TRANSACTION DATE
    // ======================================================

    let createdAt =
        new Date();


    if (date) {

        const parsedDate =
            new Date(date);


        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            const error =
                new Error(
                    "Invalid revenue date."
                );

            error.statusCode = 400;

            throw error;

        }


        createdAt =
            parsedDate;

    }


    // ======================================================
    // CREATE REVENUE
    // ======================================================

    const revenue =
        await Financials.create({

            dairy:
                dairy._id,

            dairyCode:
                dairy.code ?? null,

            type:
                "revenue",

            amount:
                numericAmount,

            description:
                cleanDescription,

            recordedBy:
                user._id,

            recordedByName:
                user.name || "",

            createdAt,

            updatedAt:
                createdAt

        });


    return revenue;

};


// ==========================================================
// RECORD LIABILITY
// ==========================================================
//
// Creates:
//
//     type = "liability"
//
// ==========================================================

exports.recordLiability =
async function(

    {

        dairyId,

        amount,

        description,

        date,

        user

    }

) {

    // ======================================================
    // VALIDATE USER
    // ======================================================

    if (!user) {

        const error =
            new Error(
                "You must be logged in to record a liability."
            );

        error.statusCode = 401;

        throw error;

    }


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy record not found."
            );

        error.statusCode = 404;

        throw error;

    }


    // ======================================================
    // VALIDATE AMOUNT
    // ======================================================

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount < 0
    ) {

        const error =
            new Error(
                "Liability amount must be a valid positive number."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE DESCRIPTION
    // ======================================================

    const cleanDescription =
        String(
            description || ""
        )
            .trim();


    if (!cleanDescription) {

        const error =
            new Error(
                "Liability description is required."
            );

        error.statusCode = 400;

        throw error;

    }


    // ======================================================
    // TRANSACTION DATE
    // ======================================================

    let createdAt =
        new Date();


    if (date) {

        const parsedDate =
            new Date(date);


        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            const error =
                new Error(
                    "Invalid liability date."
                );

            error.statusCode = 400;

            throw error;

        }


        createdAt =
            parsedDate;

    }


    // ======================================================
    // CREATE LIABILITY
    // ======================================================

    const liability =
        await Financials.create({

            dairy:
                dairy._id,

            dairyCode:
                dairy.code ?? null,

            type:
                "liability",

            amount:
                numericAmount,

            description:
                cleanDescription,

            recordedBy:
                user._id,

            recordedByName:
                user.name || "",

            createdAt,

            updatedAt:
                createdAt

        });


    return liability;

};