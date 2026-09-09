const mongoose = require("mongoose");

const Substation =
    require("../models/substations");


/* =========================================================
   GET BRANCH BY ID
========================================================= */

async function getBranchById(id) {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
    }

    const substation =
        await Substation
            .findOne({
                _id: id,
                isActive: true
            })
            .select(
                "_id name location substationIcon description productInventory"
            )
            .lean();

    if (!substation) {
        return null;
    }

    return substation;
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
    getBranchById
};