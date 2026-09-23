// ==========================================================
// controllers/branchController/renderBranch.js
// VERRAH COSMETICS
// BRANCH / SUBSTATION RENDERER
// ==========================================================
//
// RESPONSIBILITIES:
//
//     • Render successful branch pages
//     • Render not-found branch pages
//     • Render branch server-error pages
//     • Provide both branch and substation
//
// IMPORTANT:
//
//     Existing branch partials use branch.
//     Other views/controllers may use substation.
//
//     Therefore BOTH variables are intentionally supplied.
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

        // ------------------------------------------------  
        // MAIN SUBSTATION OBJECT  
        // ------------------------------------------------  

        substation,  

        // ------------------------------------------------  
        // BACKWARD-COMPATIBILITY ALIAS  
        // ------------------------------------------------  
        //  
        // Existing branch partials expect `branch`.  
        //  
        // Do not remove this unless those partials are  
        // also changed to use `substation`.  
        //  
        branch:  
            substation,  

        // ------------------------------------------------  
        // SUBSTATIONS COLLECTION  
        // ------------------------------------------------  

        substations:  
            [substation],  

        // ------------------------------------------------  
        // CURRENT USER  
        // ------------------------------------------------  

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

        // Existing partials may still try to access  
        // `branch`, so provide it explicitly.  
        branch:  
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

        // Keep the variable available to all branch  
        // partials even when loading failed.  
        branch:  
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