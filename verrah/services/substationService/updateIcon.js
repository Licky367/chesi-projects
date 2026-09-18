// ==========================================================
// verrah/services/substationService/updateIcon.js
// UPDATE SUBSTATION ICON
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../models/substations");

const {
    prepareSubstation
} = require("./helpers");

exports.updateIcon = async (
    id,
    imagePath
) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new Error(
            "Invalid substation ID."
        );
    }

    if (!imagePath) {
        throw new Error(
            "Icon image path is required."
        );
    }

    const updated =
        await Substation.findByIdAndUpdate(
            id,
            {
                $set: {
                    substationIcon:
                        imagePath
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).lean();

    return prepareSubstation(updated);
};
