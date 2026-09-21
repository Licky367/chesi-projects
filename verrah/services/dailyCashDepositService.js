// ==========================================================
// verrah/services/dailyCashDepositService.js
//
// VERRAH COSMETICS
// DAILY CASH SALES DEPOSIT / M-PESA STK PUSH
// ==========================================================

const mongoose = require("mongoose");

const Substation =
    require("../models/substations");


// ==========================================================
// M-PESA BASE URL
// ==========================================================

function getBaseUrl() {

    return process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
}


// ==========================================================
// PHONE NORMALIZATION
// ==========================================================

function cleanPhone(phone) {

    if (!phone) {
        throw new Error(
            "M-Pesa phone number is required."
        );
    }

    let value =
        String(phone)
            .replace(/\D/g, "");

    if (value.startsWith("0")) {

        value =
            `254${value.substring(1)}`;
    }

    if (!/^254\d{9}$/.test(value)) {

        throw new Error(
            "Invalid M-Pesa phone number."
        );
    }

    return value;
}


// ==========================================================
// NAIROBI DATE
// ==========================================================

function getNairobiDateString(
    date = new Date()
) {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(date);
}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);
}


// ==========================================================
// M-PESA TIMESTAMP
// ==========================================================

function getTimestamp() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const seconds =
        String(
            now.getSeconds()
        ).padStart(2, "0");

    return (
        `${year}${month}${day}` +
        `${hours}${minutes}${seconds}`
    );
}


// ==========================================================
// STK PASSWORD
// ==========================================================

function getPassword(timestamp) {

    const shortcode =
        process.env.MPESA_SHORTCODE;

    const passkey =
        process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {

        throw new Error(
            "M-Pesa shortcode or passkey is not configured."
        );
    }

    return Buffer
        .from(
            `${shortcode}${passkey}${timestamp}`
        )
        .toString("base64");
}


// ==========================================================
// FIND DAILY CASH SALE
//
// The ID belongs to dailyCashSales._id.
// ==========================================================

async function findDailyCashSale(saleId) {

    if (!isValidObjectId(saleId)) {

        throw new Error(
            "Invalid daily cash sale ID."
        );
    }

    const substation =
        await Substation.findOne({
            "dailyCashSales._id": saleId
        });

    if (!substation) {

        throw new Error(
            "Daily cash sale not found."
        );
    }

    const sale =
        substation.dailyCashSales.id(
            saleId
        );

    if (!sale) {

        throw new Error(
            "Daily cash sale not found."
        );
    }

    return {
        substation,
        sale
    };
}


// ==========================================================
// VALIDATE DEPOSIT
//
// Only previous days can be deposited.
// Today's sale is not eligible.
// ==========================================================

async function validateDeposit(saleId) {

    const {
        substation,
        sale
    } =
        await findDailyCashSale(saleId);


    if (sale.isDeposited === true) {

        throw new Error(
            "This daily cash sale has already been deposited."
        );
    }


    const saleDate =
        getNairobiDateString(
            sale.date
        );

    const today =
        getNairobiDateString();


    if (saleDate === today) {

        throw new Error(
            "Today's cash sale cannot be deposited yet."
        );
    }


    const amount =
        Number(
            sale.amount || 0
        );


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid daily cash sale amount."
        );
    }


    return {
        substation,
        sale,
        amount
    };
}


// ==========================================================
// GET DEPOSIT
//
// Used when rendering /deposit/:id
// ==========================================================

async function getDeposit(saleId) {

    const deposit =
        await validateDeposit(
            saleId
        );

    return {

        saleId:
            String(deposit.sale._id),

        substationId:
            String(deposit.substation._id),

        amount:
            deposit.amount,

        date:
            deposit.sale.date,

        isDeposited:
            deposit.sale.isDeposited
    };
}


// ==========================================================
// M-PESA ACCESS TOKEN
// ==========================================================

async function getAccessToken() {

    const consumerKey =
        process.env.MPESA_CONSUMER_KEY;

    const consumerSecret =
        process.env.MPESA_CONSUMER_SECRET;


    if (
        !consumerKey ||
        !consumerSecret
    ) {

        throw new Error(
            "M-Pesa consumer credentials are not configured."
        );
    }


    const credentials =
        Buffer
            .from(
                `${consumerKey}:${consumerSecret}`
            )
            .toString("base64");


    const response =
        await fetch(
            `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Basic ${credentials}`
                }
            }
        );


    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Invalid response from M-Pesa."
        );
    }


    if (!response.ok) {

        throw new Error(
            data.errorMessage ||
            "Unable to obtain M-Pesa access token."
        );
    }


    if (!data.access_token) {

        throw new Error(
            "M-Pesa access token was not returned."
        );
    }


    return data.access_token;
}


// ==========================================================
// INITIATE STK PUSH
// ==========================================================

async function initiateDeposit({
    saleId,
    phone,
    amount
}) {

    const deposit =
        await validateDeposit(
            saleId
        );


    // ------------------------------------------------------
    // THE DATABASE AMOUNT IS THE SOURCE OF TRUTH
    // ------------------------------------------------------

    const storedAmount =
        Number(
            deposit.amount
        );


    if (
        amount !== undefined &&
        Number(amount) !== storedAmount
    ) {

        throw new Error(
            "Payment amount does not match the daily cash sale."
        );
    }


    const mpesaPhone =
        cleanPhone(phone);


    const timestamp =
        getTimestamp();


    const accessToken =
        await getAccessToken();


    const shortcode =
        process.env.MPESA_SHORTCODE;


    const callbackUrl =
        process.env.MPESA_DAILY_CASH_CALLBACK_URL;


    if (!shortcode) {

        throw new Error(
            "MPESA_SHORTCODE is not configured."
        );
    }


    if (!callbackUrl) {

        throw new Error(
            "MPESA_DAILY_CASH_CALLBACK_URL is not configured."
        );
    }


    const accountReference =
        `CASH-${String(
            deposit.sale._id
        )}`;


    const payload = {

        BusinessShortCode:
            shortcode,

        Password:
            getPassword(timestamp),

        Timestamp:
            timestamp,

        TransactionType:
            "CustomerPayBillOnline",

        Amount:
            storedAmount,

        PartyA:
            mpesaPhone,

        PartyB:
            shortcode,

        PhoneNumber:
            mpesaPhone,

        CallBackURL:
            callbackUrl,

        AccountReference:
            accountReference,

        TransactionDesc:
            "VERRAH Daily Cash Deposit"
    };


    const response =
        await fetch(
            `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
            {
                method: "POST",

                headers: {

                    Authorization:
                        `Bearer ${accessToken}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Invalid response from M-Pesa STK Push."
        );
    }


    if (!response.ok) {

        throw new Error(
            data.errorMessage ||
            data.ResponseDescription ||
            "Unable to initiate M-Pesa STK Push."
        );
    }


    if (
        data.ResponseCode &&
        String(data.ResponseCode) !== "0"
    ) {

        throw new Error(
            data.ResponseDescription ||
            "M-Pesa STK Push was not accepted."
        );
    }


    return {

        success: true,

        saleId:
            String(
                deposit.sale._id
            ),

        amount:
            storedAmount,

        phone:
            mpesaPhone,

        merchantRequestId:
            data.MerchantRequestID,

        checkoutRequestId:
            data.CheckoutRequestID,

        responseCode:
            data.ResponseCode,

        responseDescription:
            data.ResponseDescription,

        customerMessage:
            data.CustomerMessage
    };
}


// ==========================================================
// CALLBACK ITEM
// ==========================================================

function getCallbackItem(
    items,
    name
) {

    if (!Array.isArray(items)) {
        return undefined;
    }


    const item =
        items.find(
            entry =>
                entry &&
                entry.Name === name
        );


    return item
        ? item.Value
        : undefined;
}


// ==========================================================
// EXTRACT STK CALLBACK
// ==========================================================

function extractCallback(body) {

    const stkCallback =
        body &&
        body.Body &&
        body.Body.stkCallback;


    if (!stkCallback) {

        throw new Error(
            "Invalid M-Pesa callback."
        );
    }


    const items =
        stkCallback
            .CallbackMetadata &&
        stkCallback
            .CallbackMetadata.Item;


    return {

        merchantRequestId:
            stkCallback.MerchantRequestID,

        checkoutRequestId:
            stkCallback.CheckoutRequestID,

        resultCode:
            Number(
                stkCallback.ResultCode
            ),

        resultDescription:
            stkCallback.ResultDesc,

        amount:
            Number(
                getCallbackItem(
                    items,
                    "Amount"
                ) || 0
            ),

        receiptNumber:
            getCallbackItem(
                items,
                "MpesaReceiptNumber"
            ),

        phone:
            getCallbackItem(
                items,
                "PhoneNumber"
            ),

        transactionDate:
            getCallbackItem(
                items,
                "TransactionDate"
            )
    };
}


// ==========================================================
// EXTRACT SALE ID FROM ACCOUNT REFERENCE
// ==========================================================

function getSaleIdFromReference(
    reference
) {

    if (!reference) {
        return null;
    }


    const value =
        String(reference)
            .trim();


    if (!value.startsWith("CASH-")) {
        return null;
    }


    const saleId =
        value.substring(5);


    if (!isValidObjectId(saleId)) {
        return null;
    }


    return saleId;
}


// ==========================================================
// MARK DAILY CASH SALE AS DEPOSITED
// ==========================================================

async function markDeposited(
    saleId,
    callbackAmount
) {

    if (!isValidObjectId(saleId)) {

        throw new Error(
            "Invalid daily cash sale ID."
        );
    }


    const amount =
        Number(callbackAmount);


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Invalid M-Pesa payment amount."
        );
    }


    const substation =
        await Substation.findOne({
            "dailyCashSales._id": saleId
        });


    if (!substation) {

        throw new Error(
            "Daily cash sale not found."
        );
    }


    const sale =
        substation.dailyCashSales.id(
            saleId
        );


    if (!sale) {

        throw new Error(
            "Daily cash sale not found."
        );
    }


    if (sale.isDeposited === true) {

        return {

            success: true,

            alreadyDeposited: true,

            saleId:
                String(sale._id),

            amount:
                Number(sale.amount || 0)
        };
    }


    const expectedAmount =
        Number(
            sale.amount || 0
        );


    if (
        amount !== expectedAmount
    ) {

        throw new Error(
            "M-Pesa payment amount does not match the daily cash sale."
        );
    }


    const saleDate =
        getNairobiDateString(
            sale.date
        );

    const today =
        getNairobiDateString();


    if (saleDate === today) {

        throw new Error(
            "Today's cash sale cannot be deposited yet."
        );
    }


    sale.isDeposited = true;


    await substation.save();


    return {

        success: true,

        alreadyDeposited: false,

        saleId:
            String(sale._id),

        amount:
            expectedAmount
    };
}


// ==========================================================
// HANDLE M-PESA CALLBACK
//
// The account reference contains the exact
// dailyCashSales._id.
// ==========================================================

async function handleCallback(body) {

    const callback =
        extractCallback(body);


    if (
        callback.resultCode !== 0
    ) {

        return {

            success: false,

            deposited: false,

            resultCode:
                callback.resultCode,

            resultDescription:
                callback.resultDescription,

            checkoutRequestId:
                callback.checkoutRequestId
        };
    }


    if (!callback.amount) {

        throw new Error(
            "M-Pesa payment amount is missing."
        );
    }


    const stkCallback =
        body.Body.stkCallback;


    const items =
        stkCallback.CallbackMetadata &&
        stkCallback.CallbackMetadata.Item;


    const accountReference =
        getCallbackItem(
            items,
            "AccountReference"
        );


    /*
     * AccountReference is not normally returned
     * in STK callback metadata, so use the
     * CheckoutRequestID mapping when a payment
     * record is introduced.
     *
     * For now, the callback data itself is returned
     * to the controller.
     */

    return {

        success: true,

        deposited: false,

        merchantRequestId:
            callback.merchantRequestId,

        checkoutRequestId:
            callback.checkoutRequestId,

        receiptNumber:
            callback.receiptNumber,

        amount:
            callback.amount,

        phone:
            callback.phone,

        transactionDate:
            callback.transactionDate,

        accountReference:
            accountReference,

        saleId:
            getSaleIdFromReference(
                accountReference
            )
    };
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getDeposit,

    validateDeposit,

    initiateDeposit,

    markDeposited,

    handleCallback,

    extractCallback,

    cleanPhone,

    getSaleIdFromReference
};