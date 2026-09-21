// ==========================================================
// verrah/controllers/deposit.js
//
// VERRAH COSMETICS
// DAILY CASH SALE DEPOSIT CONTROLLER
// ==========================================================

const dailyCashDepositService =
    require("../services/dailyCashDepositService");


// ==========================================================
// ERROR HELPER
// ==========================================================

function getErrorMessage(err) {

    if (!err) {
        return "Unable to process the deposit.";
    }

    return (
        err.message ||
        "Unable to process the deposit."
    );
}


// ==========================================================
// SHOW DEPOSIT PAGE
//
// GET /deposit/:id
// ==========================================================

async function showDeposit(req, res) {

    try {

        const deposit =
            await dailyCashDepositService.getDeposit(
                req.params.id
            );

        return res.render(
            "deposit",
            {
                deposit,
                user: req.user
            }
        );

    } catch (err) {

        console.error(
            "Daily cash deposit page error:",
            err
        );

        return res.status(400).send(
            getErrorMessage(err)
        );
    }
}


// ==========================================================
// INITIATE M-PESA STK PUSH
//
// POST /deposit/:id/pay
// ==========================================================

async function initiatePayment(req, res) {

    try {

        const result =
            await dailyCashDepositService.initiateDeposit(
                {
                    saleId: req.params.id,
                    phone: req.body.phone,
                    amount: req.body.amount
                }
            );

        return res.json({
            success: true,
            ...result
        });

    } catch (err) {

        console.error(
            "Daily cash deposit STK error:",
            err
        );

        return res.status(400).json({
            success: false,
            message: getErrorMessage(err)
        });
    }
}


// ==========================================================
// M-PESA CALLBACK
//
// POST /deposit/mpesa/callback
// ==========================================================

async function mpesaCallback(req, res) {

    try {

        const callback =
            await dailyCashDepositService.handleCallback(
                req.body
            );


        // --------------------------------------------------
        // SUCCESSFUL PAYMENT
        // --------------------------------------------------

        if (
            callback.success &&
            callback.saleId
        ) {

            await dailyCashDepositService.markDeposited(
                callback.saleId,
                callback.amount
            );
        }


        return res.json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });

    } catch (err) {

        console.error(
            "Daily cash M-Pesa callback error:",
            err
        );

        /*
         * Safaricom should still receive an
         * acknowledgement.
         */

        return res.json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });
    }
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {
    showDeposit,
    initiatePayment,
    mpesaCallback
};