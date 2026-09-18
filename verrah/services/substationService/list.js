// ==========================================================
// verrah/services/substationService/list.js
// LIST SUBSTATIONS
// ==========================================================

const Substation = require("../../models/substations");
const {
    prepareSubstations
} = require("./helpers");

exports.list = async () => {
    const substations =
        await Substation
            .find({
                isActive: true
            })
            .sort({
                name: 1
            })
            .lean();

    return prepareSubstations(substations);
};
