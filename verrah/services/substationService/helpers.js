// ==========================================================
// verrah/services/substationService/helpers.js
// SUBSTATION SERVICE HELPERS
// ==========================================================

const text = (value) =>
    String(value ?? "").trim();

const normalizePhoneNumber = (value) => {
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

    const number = Number(cleaned);

    if (!Number.isFinite(number)) {
        throw new Error("Invalid phone number.");
    }

    return number;
};

const normalizeCoordinate = (
    value,
    min,
    max,
    fieldName
) => {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number < min ||
        number > max
    ) {
        throw new Error(
            `${fieldName} must be between ${min} and ${max}.`
        );
    }

    return number;
};

const buildGPS = (body) => {
    const gpsSource =
        body &&
        body.gps &&
        typeof body.gps === "object"
            ? body.gps
            : body;

    const latitude =
        normalizeCoordinate(
            gpsSource.latitude,
            -90,
            90,
            "Latitude"
        );

    const longitude =
        normalizeCoordinate(
            gpsSource.longitude,
            -180,
            180,
            "Longitude"
        );

    if (
        (latitude === null && longitude !== null) ||
        (latitude !== null && longitude === null)
    ) {
        throw new Error(
            "Both latitude and longitude are required for a GPS location."
        );
    }

    return {
        latitude,
        longitude
    };
};

const normalizeDirections = (value) => {
    const directions = text(value);

    if (!directions) {
        return "";
    }

    if (/^https?:\/\//i.test(directions)) {
        throw new Error(
            "Directions must be human-readable instructions. Do not enter a Google Maps URL."
        );
    }

    if (/^www\./i.test(directions)) {
        throw new Error(
            "Directions must be human-readable instructions. Do not enter a web address."
        );
    }

    if (
        /(?:^|\s)(?:www\.)?google\.[a-z.]+\/maps(?:\/|\?|$)/i.test(
            directions
        )
    ) {
        throw new Error(
            "Directions must be human-readable instructions. Do not enter a Google Maps URL."
        );
    }

    if (
        /(?:^|\s)maps\.google\.[a-z.]+(?:\/|\?|$)/i.test(
            directions
        )
    ) {
        throw new Error(
            "Directions must be human-readable instructions. Do not enter a Google Maps URL."
        );
    }

    if (directions.length > 1000) {
        throw new Error(
            "Directions must not exceed 1000 characters."
        );
    }

    return directions;
};

const prepareSubstation = (substation) => {
    if (!substation) {
        return substation;
    }

    const result = {
        ...substation
    };

    const directions =
        text(result.directions);

    if (
        /^https?:\/\//i.test(directions) ||
        /^www\./i.test(directions) ||
        /(?:^|\s)(?:www\.)?google\.[a-z.]+\/maps(?:\/|\?|$)/i.test(
            directions
        ) ||
        /(?:^|\s)maps\.google\.[a-z.]+(?:\/|\?|$)/i.test(
            directions
        )
    ) {
        result.directions = "";
    } else {
        result.directions = directions;
    }

    return result;
};

const prepareSubstations = (substations) => {
    if (!Array.isArray(substations)) {
        return [];
    }

    return substations.map(prepareSubstation);
};

module.exports = {
    text,
    normalizePhoneNumber,
    normalizeCoordinate,
    buildGPS,
    normalizeDirections,
    prepareSubstation,
    prepareSubstations
};
