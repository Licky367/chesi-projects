// ==========================================================
// verrah/services/indexService/branches.js
// HOME PAGE BRANCH / SUBSTATION SERVICE
// ==========================================================

const Substation =
    require("../../models/substations");


// ==========================================================
// GET ACTIVE SUBSTATIONS
// ==========================================================
//
// Used by the home page.
//
// Returns only the fields required by:
// views/home-partials/branches.ejs
//
// ==========================================================

async function getActiveSubstations() {

    const substations =
        await Substation
            .find({
                isActive: true
            })
            .select(
                "_id name location substationIcon"
            )
            .sort({
                name: 1
            })
            .lean();


    return substations;

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getActiveSubstations

};