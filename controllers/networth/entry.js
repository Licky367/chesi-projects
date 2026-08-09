const networthService =
    require("../../services/networth/entry");


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth(req, res) {

    try {

        const networth =
            await networthService.getNetWorth();


        return res.render(
            "networth",
            {

                /*
                 * Total current estimated worth
                 * of all assets included in Net Worth.
                 */

                totalNetWorth:
                    networth.totalNetWorth,


                /*
                 * Identified Dairy assets that:
                 *
                 * code > 0
                 * assetCode === null
                 */

                standaloneAssets:
                    networth.standaloneAssets,


                /*
                 * Dairy Farms / structures:
                 *
                 * code < 0
                 */

                structures:
                    networth.structures

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


module.exports = {

    getNetWorth

};