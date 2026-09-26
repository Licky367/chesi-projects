// ==========================================================
// verrah/services/substationService/update.js
// UPDATE SUBSTATION
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../../models/substations");

const {
    text,
    buildGPS,
    normalizePhoneNumber,
    normalizeDirections,
    prepareSubstation
} = require("./helpers");

const {
    resolveBusinessType
} = require("./create");

exports.update = async (id, body) => {

    if (!mongoose.isValidObjectId(id)) {
        throw new Error(
            "Invalid substation ID."
        );
    }

    body = body || {};

    const existing =
        await Substation.findById(id);

    if (!existing) {
        throw new Error(
            "Substation not found."
        );
    }

    // ======================================================
    // BASIC INFORMATION
    // ======================================================

    const name =
        text(body.name);

    if (!name) {
        throw new Error(
            "Substation name is required."
        );
    }

    const duplicate =
        await Substation.findOne({
            name,
            _id: {
                $ne: id
            }
        });

    if (duplicate) {
        throw new Error(
            "A substation with that name already exists."
        );
    }

    // ======================================================
    // GPS
    // ======================================================

    const gps =
        buildGPS(body);

    // ======================================================
    // PHONE
    // ======================================================

    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );

    // ======================================================
    // DIRECTIONS
    // ======================================================

    const directions =
        normalizeDirections(
            body.directions
        );

    // ======================================================
    // BUSINESS TYPE
    // ======================================================
    //
    // Only change the business type when the edit request
    // actually provides one.
    //
    // This prevents an edit that does not contain the field
    // from accidentally removing the existing business type.
    //
    // ======================================================

    let businessType;

    if (
        body.businessType !== undefined
    ) {

        businessType =
            await resolveBusinessType(
                body.businessType
            );
    }

    // ======================================================
    // UPDATE DATA
    // ======================================================

    const updateData = {

        name,

        location:
            text(body.location),

        phoneNumber,

        description:
            text(body.description),

        directions,

        gps,

        isActive:
            body.isActive === undefined
                ? existing.isActive
                : (
                    body.isActive === true ||
                    body.isActive === "true" ||
                    body.isActive === "on"
                )
    };

    // ======================================================
    // BUSINESS TYPE
    // ======================================================

    if (
        businessType !== undefined
    ) {

        updateData.businessType =
            businessType;
    }

    // ======================================================
    // SUBSTATION ICON
    // ======================================================

    if (
        body.substationIcon !== undefined
    ) {

        const icon =
            text(body.substationIcon);

        if (icon) {

            updateData.substationIcon =
                icon;

        } else {

            updateData.substationIcon =
                existing.substationIcon || "";
        }
    }

    // ======================================================
    // UPDATE
    // ======================================================

    const updated =
        await Substation.findByIdAndUpdate(
            id,
            {
                $set: updateData
            },
            {
                new: true,
                runValidators: true
            }
        ).lean();

    return prepareSubstation(
        updated
    );
};