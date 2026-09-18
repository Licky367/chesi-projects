// ==========================================================
// verrah/services/substationService/update.js
// UPDATE SUBSTATION
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../models/substations");

const {
    text,
    buildGPS,
    normalizePhoneNumber,
    normalizeDirections,
    prepareSubstation
} = require("./helpers");

exports.update = async (id, body) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid substation ID.");
    }

    body = body || {};

    const existing =
        await Substation.findById(id);

    if (!existing) {
        throw new Error("Substation not found.");
    }

    const name = text(body.name);

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

    const gps = buildGPS(body);

    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );

    const directions =
        normalizeDirections(
            body.directions
        );

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

    if (
        body.substationIcon !== undefined
    ) {
        const icon =
            text(body.substationIcon);

        if (icon) {
            updateData.substationIcon = icon;
        } else {
            updateData.substationIcon =
                existing.substationIcon || "";
        }
    }

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

    return prepareSubstation(updated);
};
