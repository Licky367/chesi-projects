// ==========================================================
// controllers/milkSalesController.js
// ==========================================================


const milkSalesService =
    require("../services/milkSalesService");


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

        const data =
            await milkSalesService.getMilkSalesPageData(
                req.user
            );


        return res.render(
            "milk/milksales",
            {

                title:
                    "Milk Sales",

                user:
                    req.user,

                ...data,

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