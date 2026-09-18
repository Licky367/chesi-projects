// ==========================================================
// verrah/services/substationService/create.js
// CREATE SUBSTATION
// ==========================================================

const Substation = require("../../models/substations");
const {
    text,
    normalizePhoneNumber,
    buildGPS,
    normalizeDirections,
    prepareSubstation
} = require("./helpers");

exports.create = async (body) => {
    body = body || {};

    const name = text(body.name);

    if (!name) {
        throw new Error("Substation name is required.");
    }

    if (await Substation.findOne({ name })) {
        throw new Error(
            "A substation with that name already exists."
        );
    }

    const gps = buildGPS(body);

    const phoneNumber =
        normalizePhoneNumber(body.phoneNumber);

    const directions =
        normalizeDirections(body.directions);

    const substationData = {
        name,

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
