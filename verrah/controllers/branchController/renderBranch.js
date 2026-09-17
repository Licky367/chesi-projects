// ==========================================================
// controllers/branch/renderBranch.js
// VERRAH COSMETICS
// BRANCH / SUBSTATION RENDERER
// ==========================================================
//
// RESPONSIBILITIES:
//
//     • Render successful branch pages
//     • Render not-found branch pages
//     • Render branch server-error pages
//
// ==========================================================


// ==========================================================
// CURRENT USER HELPER
// ==========================================================

function getCurrentUser(req) {

    return req.session?.user || null;
}


// ==========================================================
// RENDER SUCCESS
// ==========================================================

exports.success = function (
    req,
    res,
    substation
) {

    return res.render(
        "branch",
        {
            title:
                `${substation.name} | Verrah Cosmetics`,

            // Selected substation.
            substation,

            // The branch view/partials can use this
            // collection variable.
            substations:
                [substation],

            currentUser:
                getCurrentUser(req),

            error:
                null
        }
    );
};


// ==========================================================
// RENDER NOT FOUND
// ==========================================================

exports.notFound = function (
    req,
    res
) {

    return res.status(404).render(
        "branch",
        {
            title:
                "Location Not Found | Verrah Cosmetics",

            substation:
                null,

            substations:
                [],

            currentUser:
                getCurrentUser(req),

            error:
                "The requested Verrah Cosmetics location could not be found."
        }
    );
};


// ==========================================================
// RENDER SERVER ERROR
// ==========================================================

exports.error = function (
    req,
    res
) {

    return res.status(500).render(
        "branch",
        {
            title:
                "Branch | Verrah Cosmetics",

            substation:
                null,

            substations:
                [],

            currentUser:
                getCurrentUser(req),

            error:
                "Unable to load this location."
        }
    );
};