const networthService =
    require("../../services/networth/entry");


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth(req, res) {

    try {

        const networth =
            await networthService.getNetWorth();


        /* ======================================================
           SAFE VALUES FOR EJS
        ====================================================== */

        const totalNetWorth =
            Number(
                networth.totalNetWorth || 0
            );


        const standaloneAssets =
            Array.isArray(
                networth.standaloneAssets
            )
                ? networth.standaloneAssets
                : [];


        const structures =
            Array.isArray(
                networth.structures
            )
                ? networth.structures
                : [];


        /* ======================================================
           RENDER NET WORTH PAGE
        ====================================================== */

        return res.render(
            "networth",
            {

                /*
                 * Total current estimated worth
                 * of all actual assets.
                 */

                totalNetWorth,


                /*
                 * Standalone identified assets.
                 *
                 * Definition handled by the service:
                 *
                 *     code > 0
                 *     assetCode is null/missing/empty
                 */

                standaloneAssets,


                /*
                 * Dairy Farm structures.
                 *
                 * Definition handled by the service:
                 *
                 *     code < 0
                 */

                structures

            }
        );

    } catch (error) {

        console.error(
            "Net Worth Index Error:",
            error
        );


        return res.status(500).send(
            "Unable to load Net Worth."
        );

    }

}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getNetWorth

};