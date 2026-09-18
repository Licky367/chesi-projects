// ==========================================================
// verrah/services/substationService/getById.js
// GET SUBSTATION BY ID
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../../models/substations");
const {
    prepareSubstation
} = require("./helpers");

exports.getById = async (id) => {
    if (!mongoose.isValidObjectId(id)) {
        return null;
    }

    const substation =
        await Substation
            .findById(id)
            .lean();

    return prepareSubstation(substation);
};
