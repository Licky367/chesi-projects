const networthService =
    require("../../services/networth/entry");


/* =========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth(req, res) {

    try {

        const networth =
            await networthService.getNetWorth();


        /* ==================================================
           SAFETY
           
           Make sure the service always gives the view
           arrays, even if one of them is missing.
        ================================================== */

        const standaloneAssets =
            Array.isArray(networth.standaloneAssets)
                ? networth.standaloneAssets
                : [];


        const structures =
            Array.isArray(networth.structures)
                ? networth.structures
                : [];


        const totalNetWorth =
            Number(networth.totalNetWorth || 0);


        /* ==================================================
           RENDER NET WORTH
        ================================================== */

        return res.render(
            "networth",
            {

                /* ------------------------------------------
                   TOTAL NET WORTH
                ------------------------------------------ */

                totalNetWorth,


                /* ------------------------------------------
                   STANDALONE ASSETS

                   Definition:

                       Dairy
                       code > 0
                       AND
                       assetCode is null/missing

                   The service is responsible for applying
                   this definition.
                ------------------------------------------ */

                standaloneAssets,


                /* ------------------------------------------
                   DAIRY FARMS / STRUCTURES

                   Definition:

                       dairy.code < 0

                   The service is responsible for filtering
                   these records.
                ------------------------------------------ */

                structures

            }
        );

    } catch (error) {

        console.error(
            "Net Worth Index Error:",
            error
        );


        /* ==================================================
           ERROR RESPONSE
        ================================================== */

        return res.status(500).send(
            "Unable to load Net Worth."
        );

    }

}


/* =========================================================
   EXPORTS
========================================================== */

module.exports = {

    getNetWorth

};
