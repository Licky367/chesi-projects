// ==========================================================
// verrah/controllers/substations/helpers.js
// SUBSTATION CONTROLLER HELPERS
// ==========================================================

function getRole(req) {
    return String(
        req.user?.role || ""
    ).toLowerCase();
}


// ==========================================================
// NORMALIZE PHONE NUMBER
// ==========================================================

function normalizePhoneNumber(value) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const cleaned =
        String(value)
            .trim()
            .replace(/[^\d+]/g, "");

    if (!cleaned) {
        return null;
    }

    const number =
        Number(cleaned);

    return Number.isFinite(number)
        ? number
        : null;
}


// ==========================================================
// NORMALIZE GPS COORDINATE
// ==========================================================

function normalizeCoordinate(
    value,
    min,
    max
) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        number < min ||
        number > max
    ) {
        throw new Error(
            `Invalid GPS coordinate. Value must be between ${min} and ${max}.`
        );
    }

    return number;
}


// ==========================================================
// BUILD SUBSTATION DATA
// ==========================================================

function buildSubstationData(
    req,
    existingSubstation = null
) {
    const body =
        req.body || {};

    const data = {
        name:
            body.name,

        location:
            body.location || "",

        phoneNumber:
            normalizePhoneNumber(
                body.phoneNumber
            ),

        directions:
            body.directions || "",

        description:
            body.description || "",

        gps: {
            latitude:
                normalizeCoordinate(
                    body.latitude,
                    -90,
                    90
                ),

            longitude:
                normalizeCoordinate(
                    body.longitude,
                    -180,
                    180
                )
        }
    };


    // --------------------------------------------------------
    // ICON
    // --------------------------------------------------------

    if (req.file) {
        data.substationIcon =
            `/uploads/substations/${req.file.filename}`;

    } else if (
        body.substationIconUrl &&
        String(
            body.substationIconUrl
        ).trim()
    ) {
        data.substationIcon =
            String(
                body.substationIconUrl
            ).trim();

    } else if (
        existingSubstation &&
        existingSubstation.substationIcon
    ) {
        data.substationIcon =
            existingSubstation.substationIcon;
    }


    return data;
}


module.exports = {
    getRole,
    normalizePhoneNumber,
    normalizeCoordinate,
    buildSubstationData
};
