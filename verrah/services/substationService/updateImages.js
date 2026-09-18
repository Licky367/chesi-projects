// ==========================================================
// verrah/services/substationService/updateImages.js
// UPDATE SUBSTATION IMAGES
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../../models/substations");

const {
    prepareSubstation
} = require("./helpers");

exports.updateImages = async (
    id,
    images
) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new Error(
            "Invalid substation ID."
        );
    }

    if (!Array.isArray(images)) {
        images = [];
    }

    images =
        images
            .filter(Boolean)
            .map(image =>
                String(image).trim()
            )
            .filter(Boolean);

    if (images.length > 20) {
        throw new Error(
            "A substation can have a maximum of 20 images."
        );
    }

    const updated =
        await Substation.findByIdAndUpdate(
            id,
            {
                $set: {
                    images
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).lean();

    return prepareSubstation(updated);
};
