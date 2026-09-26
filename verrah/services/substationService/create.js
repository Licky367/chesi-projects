// ==========================================================
// services/substationService/create.js
//
// SUBSTATION CREATE SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../../models/substations");

const Category =
    require("../../models/category");

const {
    text,
    normalizePhoneNumber,
    buildGPS,
    normalizeDirections,
    prepareSubstation
} = require("./helpers");


// ==========================================================
// RESOLVE BUSINESS TYPE
// ==========================================================
//
// Business type is NOT a separate model.
//
// The same businessType.id is shared by:
//   Category.businessType
//   Substation.businessType
//
// If the name already exists, reuse its ID.
// If it does not exist, create a new shared ObjectId.
// ==========================================================

async function resolveBusinessType(value) {

    let businessTypeName = "";

    if (
        value &&
        typeof value === "object"
    ) {

        businessTypeName =
            text(value.name);

    } else {

        businessTypeName =
            text(value);
    }


    if (!businessTypeName) {

        throw new Error(
            "Business type is required."
        );
    }


    // ------------------------------------------------------
    // LOOK IN CATEGORIES FIRST
    // ------------------------------------------------------

    const category =
        await Category.findOne({
            "businessType.name":
                businessTypeName
        })
        .select("businessType")
        .lean();


    if (
        category &&
        category.businessType &&
        category.businessType.id
    ) {

        return {
            id:
                category.businessType.id,

            name:
                category.businessType.name ||
                businessTypeName
        };
    }


    // ------------------------------------------------------
    // LOOK IN SUBSTATIONS
    // ------------------------------------------------------

    const substation =
        await Substation.findOne({
            "businessType.name":
                businessTypeName
        })
        .select("businessType")
        .lean();


    if (
        substation &&
        substation.businessType &&
        substation.businessType.id
    ) {

        return {
            id:
                substation.businessType.id,

            name:
                substation.businessType.name ||
                businessTypeName
        };
    }


    // ------------------------------------------------------
    // NEW BUSINESS TYPE
    // ------------------------------------------------------

    return {

        id:
            new mongoose.Types.ObjectId(),

        name:
            businessTypeName

    };
}


// ==========================================================
// GET BUSINESS TYPES
// ==========================================================
//
// Collects business types from BOTH:
//   Category
//   Substation
//
// Multiple categories/substations may use the same
// businessType.id, so duplicates are removed.
//
// No separate BusinessType model is used.
// ==========================================================

async function getBusinessTypes() {

    const [
        categories,
        substations
    ] = await Promise.all([

        Category.find({
            "businessType.name": {
                $nin: [
                    null,
                    ""
                ]
            }
        })
        .select("businessType")
        .lean(),

        Substation.find({
            "businessType.name": {
                $nin: [
                    null,
                    ""
                ]
            }
        })
        .select("businessType")
        .lean()

    ]);


    const businessTypes =
        new Map();


    // ------------------------------------------------------
    // CATEGORY BUSINESS TYPES
    // ------------------------------------------------------

    for (
        const category
        of categories
    ) {

        const businessType =
            category.businessType;


        if (
            !businessType ||
            !businessType.name
        ) {
            continue;
        }


        const name =
            text(
                businessType.name
            );


        if (!name) {
            continue;
        }


        const id =
            businessType.id
                ? String(
                    businessType.id
                )
                : "";


        // Prefer the shared ID as the
        // unique identifier.

        const key =
            id ||
            name.toLowerCase();


        if (
            !businessTypes.has(key)
        ) {

            businessTypes.set(
                key,
                {
                    id:
                        businessType.id ||
                        null,

                    name
                }
            );
        }
    }


    // ------------------------------------------------------
    // SUBSTATION BUSINESS TYPES
    // ------------------------------------------------------

    for (
        const substation
        of substations
    ) {

        const businessType =
            substation.businessType;


        if (
            !businessType ||
            !businessType.name
        ) {
            continue;
        }


        const name =
            text(
                businessType.name
            );


        if (!name) {
            continue;
        }


        const id =
            businessType.id
                ? String(
                    businessType.id
                )
                : "";


        const key =
            id ||
            name.toLowerCase();


        if (
            !businessTypes.has(key)
        ) {

            businessTypes.set(
                key,
                {
                    id:
                        businessType.id ||
                        null,

                    name
                }
            );
        }
    }


    // ------------------------------------------------------
    // SORT BY NAME
    // ------------------------------------------------------

    return Array.from(
        businessTypes.values()
    ).sort(
        (a, b) =>
            a.name.localeCompare(
                b.name
            )
    );
}


// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (body) => {

    body = body || {};


    const name =
        text(body.name);


    if (!name) {

        throw new Error(
            "Substation name is required."
        );
    }


    if (
        await Substation.findOne({
            name
        })
    ) {

        throw new Error(
            "A substation with that name already exists."
        );
    }


    const gps =
        buildGPS(body);


    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );


    const directions =
        normalizeDirections(
            body.directions
        );


    const businessType =
        await resolveBusinessType(
            body.businessType
        );


    const substationData = {

        name,

        businessType,

        location:
            text(body.location),

        phoneNumber,

        substationIcon:
            text(body.substationIcon),

        description:
            text(body.description),

        directions,

        gps,

        isActive:
            body.isActive === undefined
                ? true
                : (
                    body.isActive === true ||
                    body.isActive === "true" ||
                    body.isActive === "on"
                )

    };


    const created =
        await Substation.create(
            substationData
        );


    return prepareSubstation(
        created.toObject()
    );
};


// ==========================================================
// EXPORT BUSINESS TYPE HELPERS
// ==========================================================

exports.getBusinessTypes =
    getBusinessTypes;

exports.resolveBusinessType =
    resolveBusinessType;