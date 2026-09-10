// ==========================================================
// verrah/services/branchService.js
// PUBLIC BRANCH SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../models/substations");


// ==========================================================
// GET BRANCH BY ID
// ==========================================================

async function getBranchById(id) {

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {
        return null;
    }

    const substation =
        await Substation
            .findOne({
                _id: id,
                isActive: true
            })
            .select(
                [
                    "_id",
                    "name",
                    "location",
                    "phoneNumber",
                    "directions",
                    "substationIcon",
                    "images",
                    "description",
                    "productInventory"
                ].join(" ")
            )
            .lean();

    return substation || null;
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    getBranchById
};
