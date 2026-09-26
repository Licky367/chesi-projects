// ==========================================================
// verrah/services/substationService/create.js
// CREATE SUBSTATION
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../../models/substations");
const Category = require("../../models/category");

const {
    text,
    normalizePhoneNumber,
    buildGPS,
    normalizeDirections,
    prepareSubstation
} = require("./helpers");


// ==========================================================
// BUSINESS TYPE
// ==========================================================
//
// Business types are shared between Categories and
// Substations.
//
// There is no separate BusinessType model.
//
// The shared business type is represented as:
//
// {
//     id: ObjectId("..."),
//     name: "Cosmetics"
// }
//
// Category.businessType.id
// Substation.businessType.id
//
// must contain the SAME ID for the same business type.
//
// ==========================================================

async function resolveBusinessType(value) {

    // ------------------------------------------------------
    // NORMALIZE INPUT
    // ------------------------------------------------------

    let businessTypeName = "";

    if (typeof value === "string") {

        businessTypeName =
            text(value);

    } else if (
        value &&
        typeof value === "object"
    ) {

        businessTypeName =
            text(value.name);
    }

    // ------------------------------------------------------
    // NO BUSINESS TYPE
    // ------------------------------------------------------

    if (!businessTypeName) {

        return {
            id: null,
            name: ""
        };
    }

    // ------------------------------------------------------
    // FIND EXISTING BUSINESS TYPE
    // ------------------------------------------------------
    //
    // First check Categories because Category.businessType
    // is the shared business-type source.
    //
    // Several categories may use the same business type.
    //
    // ------------------------------------------------------

    const existingCategory =
        await Category.findOne({
            "businessType.name": businessTypeName
        })
        .select("businessType")
        .lean();

    if (
        existingCategory &&
        existingCategory.businessType &&
        existingCategory.businessType.id
    ) {

        return {
            id:
                existingCategory.businessType.id,

            name:
                existingCategory.businessType.name ||
                businessTypeName
        };
    }

    // ------------------------------------------------------
    // CHECK EXISTING SUBSTATION
    // ------------------------------------------------------
    //
    // This covers a business type that may already have
    // been assigned to a substation even if no Category
    // currently carries it.
    //
    // ------------------------------------------------------

    const existingSubstation =
        await Substation.findOne({
            "businessType.name": businessTypeName
        })
        .select("businessType")
        .lean();

    if (
        existingSubstation &&
        existingSubstation.businessType &&
        existingSubstation.businessType.id
    ) {

        return {
            id:
                existingSubstation.businessType.id,

            name:
                existingSubstation.businessType.name ||
                businessTypeName
        };
    }

    // ------------------------------------------------------
    // CREATE NEW BUSINESS TYPE ID
    // ------------------------------------------------------
    //
    // There is no separate BusinessType document.
    //
    // The ObjectId itself is the shared business-type ID.
    //
    // ------------------------------------------------------

    return {
        id:
            new mongoose.Types.ObjectId(),

        name:
            businessTypeName
    };
}


// ==========================================================
// EXPORT BUSINESS TYPE RESOLVER
// ==========================================================
//
// The update service can use this same resolver when the
// business type of an existing substation is changed.
//
// Example:
//
// const {
//     resolveBusinessType
// } = require("./create");
//
// const businessType =
//     await resolveBusinessType(
//         body.businessType
//     );
//
// ==========================================================

exports.resolveBusinessType =
    resolveBusinessType;


// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (body) => {

    body = body || {};

    // ------------------------------------------------------
    // BASIC INFORMATION
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // GPS
    // ------------------------------------------------------

    const gps =
        buildGPS(body);

    // ------------------------------------------------------
    // PHONE
    // ------------------------------------------------------

    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );

    // ------------------------------------------------------
    // DIRECTIONS
    // ------------------------------------------------------

    const directions =
        normalizeDirections(
            body.directions
        );

    // ------------------------------------------------------
    // BUSINESS TYPE
    // ------------------------------------------------------
    //
    // The service creates/resolves the shared business type.
    //
    // The form only needs to provide the business type name.
    //
    // ------------------------------------------------------

    const businessType =
        await resolveBusinessType(
            body.businessType
        );

    // ------------------------------------------------------
    // SUBSTATION DATA
    // ------------------------------------------------------

    const substationData = {

        name,

        location:
            text(body.location),

        phoneNumber,

        businessType,

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

    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const created =
        await Substation.create(
            substationData
        );

    // ------------------------------------------------------
    // RETURN
    // ------------------------------------------------------

    return prepareSubstation(
        created.toObject()
    );
};