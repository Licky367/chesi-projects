// ==========================================================
// controllers/milkSalesController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Controller for the Milk Sales page.
//
// VIEW:
//     views/milk/milksales.ejs
//
// SERVICE:
//     services/milkSalesService.js
//
// DATA PASSED TO VIEW
// ----------------------------------------------------------
//     title
//     user
//     summary
//     farms
//     farmData
//     sales
//     salesTotals
//     totalProduced
//     totalConsumed
//     totalCash
//     available
//     price
//     day
//     month
//     locked
//     success
//     error
//
// IMPORTANT
// ----------------------------------------------------------
// Farm availability is calculated by the service using:
//
//     farm production
//     -
//     farm sale allocations
//
// Overall availability is:
//
//     produced
//     -
//     consumed
//
// ==========================================================


const milkSalesService =
    require("../services/milkSalesService");


// ==========================================================
// NUMBER HELPER
// ==========================================================

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )

        ? number

        : 0;

}


// ==========================================================
// ROUND HELPER
// ==========================================================

function round(
    value
) {

    const number =
        toNumber(
            value
        );


    return Math.round(
        number * 100
    ) / 100;

}


// ==========================================================
// GET MILK SALES PAGE
// ==========================================================

exports.getMilkSalesPage =
async function(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const user =
            req.user;


        if (!user) {

            throw new Error(
                "Authenticated user is required."
            );

        }


        // ==================================================
        // GET BASE PAGE DATA
        // ==================================================

        const data =
            await milkSalesService.getMilkSalesPageData(
                user
            );


        const summary =
            data.summary || {};


        const farms =
            Array.isArray(
                data.farms
            )

                ? data.farms

                : [];


        // ==================================================
        // DAY
        // ==================================================

        const day =
            summary.day ||
            milkSalesService.getNairobiDay();


        // ==================================================
        // MONTH
        // ==================================================

        const month =
            summary.month ||
            day.slice(
                0,
                7
            );


        // ==================================================
        // PRICE
        // ==================================================

        const price =
            round(
                summary.price ??
                data.price ??
                50
            );


        // ==================================================
        // PRODUCTION
        // ==================================================

        const totalProduced =
            round(
                summary.produced
            );


        // ==================================================
        // CONSUMED / SOLD
        // ==================================================

        const totalConsumed =
            round(
                summary.consumed
            );


        // ==================================================
        // CASH
        // ==================================================

        const totalCash =
            round(
                summary.cash
            );


        // ==================================================
        // OVERALL AVAILABLE
        // ==================================================
        //
        // This deliberately does not simply trust a stale
        // stored `summary.available`.
        //
        // It is reconstructed from:
        //
        //     produced - consumed
        //
        // This guarantees that the value passed to the view
        // reflects the current sales total.
        //
        // ==================================================

        const available =
            Math.max(

                0,

                round(

                    totalProduced -
                    totalConsumed

                )

            );


        // ==================================================
        // SALES
        // ==================================================

        const sales =
            Array.isArray(
                summary.sales
            )

                ? summary.sales

                : [];


        // ==================================================
        // SALES TOTALS
        // ==================================================
        //
        // Use the service helper when available.
        //
        // This gives the view a clean object:
        //
        //     salesTotals.liters
        //     salesTotals.cash
        //
        // ==================================================

        let salesTotals = {

            liters:
                totalConsumed,

            cash:
                totalCash

        };


        if (
            typeof summary.calculateSalesTotals ===
            "function"
        ) {

            const calculated =
                summary.calculateSalesTotals();


            if (
                calculated &&
                typeof calculated ===
                    "object"
            ) {

                salesTotals = {

                    liters:
                        round(
                            calculated.liters
                        ),

                    cash:
                        round(
                            calculated.cash
                        )

                };

            }

        }


        // ==================================================
        // FARM DATA
        // ==================================================
        //
        // Each farm receives:
        //
        //     farm
        //     produced
        //     sold
        //     available
        //
        // This means milksales.ejs does not need to know
        // how farm availability is calculated.
        //
        // ==================================================

        const farmData =
            await Promise.all(

                farms.map(
                    async farm => {

                        const farmId =
                            farm &&
                            farm._id
                                ? farm._id
                                : null;


                        if (!farmId) {

                            return {

                                farm,

                                produced:
                                    0,

                                sold:
                                    0,

                                available:
                                    0

                            };

                        }


                        // ==================================
                        // FARM PRODUCED
                        // ==================================

                        let produced =
                            0;


                        if (
                            Array.isArray(
                                summary.farmProduction
                            )
                        ) {

                            const production =
                                summary.farmProduction.find(
                                    entry => {

                                        if (
                                            !entry ||
                                            !entry.farm
                                        ) {

                                            return false;

                                        }


                                        return (
                                            entry.farm.toString() ===
                                            farmId.toString()
                                        );

                                    }
                                );


                            if (production) {

                                produced =
                                    round(
                                        production.liters
                                    );

                            }

                        }


                        // ==================================
                        // FARM AVAILABLE
                        // ==================================
                        //
                        // Service calculates:
                        //
                        //     farm production
                        //     -
                        //     farm allocations
                        //
                        // ==================================

                        const available =
                            round(

                                await milkSalesService
                                    .getFarmAvailable(
                                        summary,
                                        farmId
                                    )

                            );


                        // ==================================
                        // FARM SOLD
                        // ==================================

                        const sold =
                            Math.max(

                                0,

                                round(

                                    produced -
                                    available

                                )

                            );


                        return {

                            farm,

                            produced,

                            sold,

                            available

                        };

                    }
                )

            );


        // ==================================================
        // FARM LOOKUP MAP
        // ==================================================
        //
        // Useful if the EJS needs quick access by farm ID.
        //
        // Example:
        //
        //     farmAvailability[farm._id]
        //
        // ==================================================

        const farmAvailability =
            {};


        farmData.forEach(
            item => {

                if (
                    !item ||
                    !item.farm ||
                    !item.farm._id
                ) {

                    return;

                }


                farmAvailability[
                    item.farm._id.toString()
                ] = {

                    produced:
                        item.produced,

                    sold:
                        item.sold,

                    available:
                        item.available

                };

            }
        );


        // ==================================================
        // FARM SOLD TOTAL
        // ==================================================
        //
        // Sum the farm-level allocations represented by the
        // farmData objects.
        //
        // ==================================================

        const farmSoldTotal =
            round(

                farmData.reduce(

                    (
                        total,
                        item
                    ) =>

                        total +
                        toNumber(
                            item.sold
                        ),

                    0

                )

            );


        // ==================================================
        // LOCK STATUS
        // ==================================================

        const locked =
            Boolean(
                summary.locked
            );


        // ==================================================
        // RESPONSE DATA
        // ==================================================

        return res.render(

            "milk/milksales",

            {

                // ==========================================
                // PAGE
                // ==========================================

                title:
                    "Milk Sales",


                // ==========================================
                // USER
                // ==========================================

                user,


                // ==========================================
                // SUMMARY
                // ==========================================

                summary,


                // ==========================================
                // DAY / MONTH
                // ==========================================

                day,

                month,


                // ==========================================
                // FARMS
                // ==========================================

                farms,

                farmData,

                farmAvailability,

                // ==========================================
                // FARM SOLD TOTAL
                // ==========================================

                farmSoldTotal,


                // ==========================================
                // SALES
                // ==========================================

                sales,

                salesTotals,


                // ==========================================
                // MILK TOTALS
                // ==========================================

                totalProduced,

                totalConsumed,

                totalCash,

                available,


                // ==========================================
                // PRICE
                // ==========================================

                price,


                // ==========================================
                // LOCK
                // ==========================================

                locked,


                // ==========================================
                // FLASH MESSAGES
                // ==========================================

                success:
                    req.query.success ||
                    "",

                error:
                    req.query.error ||
                    ""

            }

        );

    }

    catch (error) {

        next(error);

    }

};


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// ADMIN ONLY
//
// ==========================================================

exports.updateMilkPrice =
async function(
    req,
    res,
    next
) {

    try {

        await milkSalesService.updateMilkPrice(

            req.user,

            {

                day:
                    req.body.day,

                price:
                    req.body.price

            }

        );


        return res.redirect(

            "/milk/sales?success=" +

            encodeURIComponent(

                "Milk price updated successfully."

            )

        );

    }

    catch (error) {

        return res.redirect(

            "/milk/sales?error=" +

            encodeURIComponent(

                error.message

            )

        );

    }

};


// ==========================================================
// SELL MILK
// ==========================================================

exports.sellMilk =
async function(
    req,
    res,
    next
) {

    try {

        await milkSalesService.sellMilk(

            req.user,

            {

                day:
                    req.body.day,

                customerName:
                    req.body.customerName,

                liters:
                    req.body.liters,

                allocations:
                    req.body.allocations

            }

        );


        return res.redirect(

            "/milk/sales?success=" +

            encodeURIComponent(

                "Milk sale completed successfully."

            )

        );

    }

    catch (error) {

        return res.redirect(

            "/milk/sales?error=" +

            encodeURIComponent(

                error.message

            )

        );

    }

};