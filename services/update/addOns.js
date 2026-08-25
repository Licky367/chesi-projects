// ==========================================================
// services/update/addOnsService.js
// ADD-ONS FINANCIAL SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles financial transactions for a Dairy:
//
//     1. Loading financial add-ons page data
//
//     2. Recording revenue
//
//     3. Recording liabilities
//
// ROUTES
// ----------------------------------------------------------
//
// Revenue:
//
//     POST /dairy/:id/revenue
//
// Liability:
//
//     POST /dairy/:id/liability
//
// IMPORTANT
// ----------------------------------------------------------
//
// The transaction type is NEVER taken from the request.
//
// The service explicitly creates:
//
//     revenue   → type: "revenue"
//     liability → type: "liability"
//
// The Dairy ID comes from:
//
//     req.params.id
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


const Financials =
    require("../../models/financials");


// ==========================================================
// INTERNAL ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// INTERNAL DAIRY VALIDATION
// ==========================================================

async function getDairy(
    dairyId
) {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw createError(
            "Dairy record not found.",
            404
        );

    }


    return dairy;

}


// ==========================================================
// INTERNAL USER VALIDATION
// ==========================================================

function validateUser(
    user,
    transactionName
) {

    if (!user) {

        throw createError(
            `You must be logged in to record ${transactionName}.`,
            401
        );

    }

}


// ==========================================================
// INTERNAL AMOUNT VALIDATION
// ==========================================================

function validateAmount(
    amount,
    transactionName
) {

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount < 0
    ) {

        throw createError(
            `${transactionName} amount must be a valid positive number.`,
            400
        );

    }


    return numericAmount;

}


// ==========================================================
// INTERNAL DESCRIPTION VALIDATION
// ==========================================================

function validateDescription(
    description,
    transactionName
) {

    const cleanDescription =
        String(
            description || ""
        )
            .trim();


    if (!cleanDescription) {

        throw createError(
            `${transactionName} description is required.`,
            400
        );

    }


    return cleanDescription;

}


// ==========================================================
// INTERNAL DATE VALIDATION
// ==========================================================
//
// The HTML form sends:
//
//     YYYY-MM-DD
//
// If no date is supplied, the current date/time is used.
//
// ==========================================================

function resolveTransactionDate(
    date,
    transactionName
) {

    if (!date) {

        return new Date();

    }


    const parsedDate =
        new Date(date);


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        throw createError(
            `Invalid ${transactionName} date.`,
            400
        );

    }


    return parsedDate;

}


// ==========================================================
// GET ADD-ONS PAGE DATA
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Resolves the Dairy used by:
//
//     GET /dairy/:id/addOns
//
// Returns:
//
//     {
//         dairy,
//         user
//     }
//
// ==========================================================

exports.getAddOnsPageData =
async function(
    req
) {

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

    const dairyId =
        req.params?.id;


    // ======================================================
    // DAIRY
    // ======================================================

    const dairy =
        await getDairy(
            dairyId
        );


    // ======================================================
    // RETURN
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
// ROUTE:
//
//     POST /dairy/:id/revenue
//
// EXPECTED REQUEST:
//
//     req.params.id
//
//     req.body.amount
//
//     req.body.description
//
//     req.body.date
//
// The transaction type is ALWAYS:
//
//     "revenue"
//
// ==========================================================

exports.recordRevenue =
async function({

    dairyId,

    amount,

    description,

    date,

    user

}) {

    // ======================================================
    // USER
    // ======================================================

    validateUser(
        user,
        "revenue"
    );


    // ======================================================
    // DAIRY
    // ======================================================

    const dairy =
        await getDairy(
            dairyId
        );


    // ======================================================
    // AMOUNT
    // ======================================================

    const numericAmount =
        validateAmount(
            amount,
            "Revenue"
        );


    // ======================================================
    // DESCRIPTION
    // ======================================================

    const cleanDescription =
        validateDescription(
            description,
            "Revenue"
        );


    // ======================================================
    // DATE
    // ======================================================

    const createdAt =
        resolveTransactionDate(
            date,
            "revenue"
        );


    // ======================================================
    // CREATE FINANCIAL RECORD
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


    // ======================================================
    // RETURN CREATED RECORD
    // ======================================================

    return revenue;

};


// ==========================================================
// RECORD LIABILITY
// ==========================================================
//
// ROUTE:
//
//     POST /dairy/:id/liability
//
// EXPECTED REQUEST:
//
//     req.params.id
//
//     req.body.amount
//
//     req.body.description
//
//     req.body.date
//
// The transaction type is ALWAYS:
//
//     "liability"
//
// ==========================================================

exports.recordLiability =
async function({

    dairyId,

    amount,

    description,

    date,

    user

}) {

    // ======================================================
    // USER
    // ======================================================

    validateUser(
        user,
        "liability"
    );


    // ======================================================
    // DAIRY
    // ======================================================

    const dairy =
        await getDairy(
            dairyId
        );


    // ======================================================
    // AMOUNT
    // ======================================================

    const numericAmount =
        validateAmount(
            amount,
            "Liability"
        );


    // ======================================================
    // DESCRIPTION
    // ======================================================

    const cleanDescription =
        validateDescription(
            description,
            "Liability"
        );


    // ======================================================
    // DATE
    // ======================================================

    const createdAt =
        resolveTransactionDate(
            date,
            "liability"
        );


    // ======================================================
    // CREATE FINANCIAL RECORD
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


    // ======================================================
    // RETURN CREATED RECORD
    // ======================================================

    return liability;

};


// ==========================================================
// EXPORT SUMMARY
// ==========================================================
//
// AVAILABLE METHODS:
//
//     getAddOnsPageData(req)
//
//     recordRevenue({...})
//
//     recordLiability({...})
//
// ROUTES:
//
//     GET
//         /dairy/:id/addOns
//
//     POST
//         /dairy/:id/revenue
//
//     POST
//         /dairy/:id/liability
//
// ==========================================================