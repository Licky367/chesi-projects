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
           RENDER
        ====================================================== */

        return res.render(
            "networth",
            {
                totalNetWorth,
                standaloneAssets,
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