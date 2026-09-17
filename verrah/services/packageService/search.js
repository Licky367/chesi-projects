// ==========================================================
// verrah/services/packageService/search.js
//
// VERRAH COSMETICS
// PACKAGE SERVICE
// PRODUCT SEARCH
//
// Searches products available at a customer's substation
// by product name, category, or a closely matching term.
// ==========================================================

const mongoose = require("mongoose");

const Product =
    require("../../models/products");

const Substation =
    require("../../models/substations");


// ==========================================================
// CONSTANTS
// ==========================================================

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;


// ==========================================================
// HELPERS
// ==========================================================

function text(value) {

    return String(value || "")
        .trim();

}


function escapeRegex(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


function normalizeSearch(value) {

    return text(value)
        .replace(/\s+/g, " ")
        .trim();

}


function normalizeLimit(value) {

    const number =
        Number.parseInt(value, 10);

    if (!Number.isFinite(number)) {

        return DEFAULT_LIMIT;

    }

    return Math.min(
        Math.max(number, 1),
        MAX_LIMIT
    );

}


// ==========================================================
// FIND SUBSTATION
// ==========================================================
//
// Accepts either:
// - MongoDB ObjectId
// - substation code/id supplied by the application
//
// The primary use is ObjectId.
//
// ==========================================================

async function getSubstation(substationId) {

    if (!substationId) {

        return null;

    }


    if (
        mongoose.Types.ObjectId.isValid(
            substationId
        )
    ) {

        return Substation
            .findById(substationId)
            .lean();

    }


    return null;

}


// ==========================================================
// SEARCH PRODUCTS
// ==========================================================
//
// searchProducts({
//     substationId,
//     query,
//     category,
//     limit
// })
//
// Examples:
//
// query = "lotion"
// query = "body"
// query = "hair"
// category = "skincare"
// category = "hair care"
//
// ==========================================================

async function searchProducts(options = {}) {

    const {

        substationId,

        query = "",

        category = "",

        limit = DEFAULT_LIMIT

    } = options;


    const searchText =
        normalizeSearch(query);

    const categoryText =
        normalizeSearch(category);


    const resultLimit =
        normalizeLimit(limit);


    // ------------------------------------------------------
    // SUBSTATION IS REQUIRED
    // ------------------------------------------------------

    if (!substationId) {

        return {

            products: [],

            count: 0,

            query: searchText,

            category: categoryText

        };

    }


    // ------------------------------------------------------
    // VERIFY SUBSTATION
    // ------------------------------------------------------

    const substation =
        await getSubstation(
            substationId
        );


    if (!substation) {

        return {

            products: [],

            count: 0,

            query: searchText,

            category: categoryText

        };

    }


    // ------------------------------------------------------
    // BUILD PRODUCT FILTER
    // ------------------------------------------------------

    const filter = {

        isActive: true

    };


    // ------------------------------------------------------
    // SEARCH TEXT
    // ------------------------------------------------------
    //
    // Search both:
    //
    // - name
    // - category
    //
    // A partial match is allowed.
    //
    // Example:
    //
    // "lotion"
    //
    // can match:
    //
    // "Body Lotion"
    // "Hand Lotion"
    // "Moisturizing Lotion"
    //
    // ------------------------------------------------------

    if (searchText) {

        const escaped =
            escapeRegex(searchText);

        filter.$or = [

            {
                name: {
                    $regex: escaped,
                    $options: "i"
                }
            },

            {
                category: {
                    $regex: escaped,
                    $options: "i"
                }
            }

        ];

    }


    // ------------------------------------------------------
    // CATEGORY FILTER
    // ------------------------------------------------------

    if (categoryText) {

        filter.category = {

            $regex:
                escapeRegex(categoryText),

            $options: "i"

        };

    }


    // ------------------------------------------------------
    // SUBSTATION INVENTORY
    // ------------------------------------------------------
    //
    // The exact inventory structure can differ between
    // substations. We therefore first search the Product
    // collection using the product criteria.
    //
    // Products are then matched against the substation
    // inventory when inventory information is available.
    //
    // ------------------------------------------------------

    let products =
        await Product
            .find(filter)
            .sort({
                name: 1
            })
            .limit(resultLimit)
            .lean();


    // ------------------------------------------------------
    // MAP PRODUCTS
    // ------------------------------------------------------

    products