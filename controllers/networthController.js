const networthService =
    require(
        "../services/networthService"
    );


/* =========================================================
   HELPER
   RENDER ERROR

   Keeps controller error handling consistent without
   exposing internal database errors to the browser.
========================================================= */

function renderError(
    res,
    error,
    fallbackPath = "/networth"
) {

    console.error(
        "Net Worth Controller Error:",
        error
    );


    /*
     * If the application already provides a global error
     * middleware, forward the error instead.
     */

    if (typeof res.locals.renderError === "function") {

        return res.locals.renderError(
            error
        );

    }


    /*
     * If the request accepts HTML, return a normal
     * application-level error response.
     */

    if (
        res.req &&
        res.req.accepts &&
        res.req.accepts("html")
    ) {

        return res.status(500).render(
            "error",
            {
                message:
                    "Unable to complete the Net Worth request.",

                backUrl:
                    fallbackPath
            }
        );

    }


    return res.status(500).json({

        success: false,

        message:
            "Unable to complete the Net Worth request."

    });

}


/* =========================================================
   GET NET WORTH DASHBOARD

   GET /networth
========================================================= */

exports.getNetWorth =
async function (
    req,
    res
) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.render(
            "networth",
            data
        );

    }

    catch (error) {

        return renderError(
            res,
            error
        );

    }

};


/* =========================================================
   GET STRUCTURE DETAILS

   GET /networth/structure/:id
========================================================= */

exports.getStructure =
async function (
    req,
    res
) {

    try {

        const structure =
            await networthService.getStructure(
                req.params.id
            );


        if (!structure) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        return res.render(
            "networth-structure",
            {
                structure
            }
        );

    }

    catch (error) {

        return renderError(
            res,
            error,
            "/networth"
        );

    }

};


/* =========================================================
   GET ADD-ASSET FORM

   GET /networth/structure/:id/add
========================================================= */

exports.getAddAsset =
async function (
    req,
    res
) {

    try {

        const dairy =
            await networthService.getStructure(
                req.params.id
            );


        if (!dairy) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        return res.render(
            "networth-add",
            {
                dairy
            }
        );

    }

    catch (error) {

        return renderError(
            res,
            error,
            "/networth"
        );

    }

};


/* =========================================================
   CREATE MANUAL ASSET

   POST /networth/structure/:id/add
========================================================= */

exports.addAsset =
async function (
    req,
    res
) {

    try {

        const asset =
            await networthService.addManualAsset(
                req.params.id,
                req.body
            );


        /*
         * After creation, go to the new asset's
         * details page.
         */

        return res.redirect(
            `/networth/asset/${asset._id}`
        );

    }

    catch (error) {

        console.error(
            "Unable to add Net Worth asset:",
            error
        );


        /*
         * Validation errors should return the user
         * to the form rather than becoming a generic
         * server error.
         */

        if (
            error.name ===
            "ValidationError"
        ) {

            const dairy =
                await networthService
                    .getStructure(
                        req.params.id
                    );


            return res.status(400).render(
                "networth-add",
                {
                    dairy,

                    error:
                        error.message,

                    formData:
                        req.body
                }
            );

        }


        return renderError(
            res,
            error,
            `/networth/structure/${req.params.id}`
        );

    }

};


/* =========================================================
   GET ASSET DETAILS / EDIT

   GET /networth/asset/:id
========================================================= */

exports.getAsset =
async function (
    req,
    res
) {

    try {

        const data =
            await networthService.getAsset(
                req.params.id
            );


        if (!data || !data.dairy) {

            return res.status(404).send(
                "Asset not found."
            );

        }


        return res.render(
            "networth-asset",
            data
        );

    }

    catch (error) {

        return renderError(
            res,
            error,
            "/networth"
        );

    }

};


/* =========================================================
   UPDATE ASSET

   PUT /networth/asset/:id
========================================================= */

exports.updateAsset =
async function (
    req,
    res
) {

    try {

        const asset =
            await networthService.updateAsset(
                req.params.id,
                req.body
            );


        if (!asset) {

            return res.status(404).send(
                "Asset not found."
            );

        }


        return res.redirect(
            `/networth/asset/${asset._id}`
        );

    }

    catch (error) {

        console.error(
            "Unable to update Net Worth asset:",
            error
        );


        if (
            error.name ===
            "ValidationError"
        ) {

            const data =
                await networthService
                    .getAsset(
                        req.params.id
                    );


            return res.status(400).render(
                "networth-asset",
                {
                    ...data,

                    error:
                        error.message,

                    formData:
                        req.body
                }
            );

        }


        return renderError(
            res,
            error,
            "/networth"
        );

    }

};