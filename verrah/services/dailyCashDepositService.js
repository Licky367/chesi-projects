// ==========================================================
// verrah/services/dailyCashDepositService.js
//
// VERRAH COSMETICS
// DAILY CASH SALES DEPOSIT / M-PESA STK PUSH
// ==========================================================

const axios = require("axios");
const mongoose = require("mongoose");

const Substation = require("../models/substations");


// ==========================================================
// M-PESA CONFIGURATION
// ==========================================================

function getBaseUrl() {

    return process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
}


// ==========================================================
// HELPERS
// ==========================================================

function cleanPhone(phone) {

    if (!phone) {
        throw new Error("M-Pesa phone number is required.");
    }

    let value = String(phone).replace(/\D/g, "");

    if (value.startsWith("0")) {
        value = `254${value.substring(1)}`;
    }

    if (value.startsWith("+")) {
        value = value.substring(1);
    }

    if (!/^254\d{9}$/.test(value)) {
        throw new Error("Invalid M-Pesa phone number.");
    }

    return value;
}


function getTimestamp() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}


function getPassword(timestamp) {

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {
        throw new Error("M-Pesa shortcode or passkey is not configured.");
    }

    return Buffer
        .from(`${shortcode}${passkey}${timestamp}`)
        .toString("base64");
}


function getNairobiDateString(date = new Date()) {

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


function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);
}


// ==========================================================
// FIND DAILY CASH SALE
// ==========================================================

async function findDailyCashSale(saleId) {

    if (!isValidObjectId(saleId)) {
        throw new Error("Invalid daily cash sale ID.");
    }

    const substation = await Substation.findOne({
        "dailyCashSales._id": saleId
    });

    if (!substation) {
        throw new Error("Daily cash sale not found.");
    }

    const sale = substation.dailyCashSales.id(saleId);

    if (!sale) {
        throw new Error("Daily cash sale not found.");
    }

    return {
        substation,
        sale
    };
}


// ==========================================================
// VALIDATE DEPOSIT
//
// Only previous days are allowed.
// Today's cash sale cannot be deposited yet.
// ==========================================================

async function validateDeposit(saleId) {

    const { substation, sale } =
        await findDailyCashSale(saleId);

    if (sale.isDeposited === true) {
        throw new Error("This daily cash sale has already been deposited.");
    }

    const saleDate =
        getNairobiDateString(sale.date);

    const today =
        getNairobiDateString();

    if (saleDate === today) {
        throw new Error(
            "Today's cash sale cannot be deposited yet."
        );
    }

    const amount = Number(sale.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
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
// GET DAILY CASH SALE
//
// Used by the deposit page.
// ==========================================================

async function getDeposit(saleId) {

    const result =
        await validateDeposit(saleId);

    return {
        saleId: result.sale._id,
        substationId: result.substation._id,
        amount: result.amount,
        date: result.sale.date,
        isDeposited: result.sale.isDeposited
    };
}


// ==========================================================
// GET ACCESS TOKEN
// ==========================================================

async function getAccessToken() {

    const consumerKey =
        process.env.MPESA_CONSUMER_KEY;

    const consumerSecret =
        process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
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
        await axios.get(
            `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization:
                        `Basic ${credentials}`
                }
            }
        );

    return response.data.access_token;
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
        await validateDeposit(saleId);

    // ------------------------------------------------------
    // NEVER TRUST THE FRONTEND AMOUNT
    // ------------------------------------------------------

    const storedAmount =
        Number(deposit.amount);

    if (
        amount !== undefined &&
        Number(amount) !== storedAmount
    ) {
        throw new Error(
            "Payment amount does not match the daily cash sale."
        );
    }

    const mpesaPhone =
        cleanPhone(
            phone
            || process.env.MPESA_DEPOSIT_PHONE
        );

    const timestamp =
        getTimestamp();

    const accessToken =
        await getAccessToken();

    const shortcode =
        process.env.MPESA_SHORTCODE;

    const callbackUrl =
        process.env.MPESA_DAILY_CASH_CALLBACK_URL;

    if (!callbackUrl) {
        throw new Error(
            "MPESA_DAILY_CASH_CALLBACK_URL is not configured."
        );
    }

    const accountReference =
        `CASH-${String(deposit.sale._id).slice(-8)}`;

    const transactionDescription =
        "VERRAH Daily Cash Deposit";

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
            transactionDescription
    };

    const response =
        await axios.post(
            `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,
                    "Content-Type":
                        "application/json"
                }
            }
        );

    return {
        success: true,
        saleId: deposit.sale._id,
        amount: storedAmount,
        phone: mpesaPhone,
        merchantRequestId:
            response.data.MerchantRequestID,
        checkoutRequestId:
            response.data.CheckoutRequestID,
        responseCode:
            response.data.ResponseCode,
        responseDescription:
            response.data.ResponseDescription,
        customerMessage:
            response.data.CustomerMessage
    };
}


// ==========================================================
// CALLBACK HELPERS
// ==========================================================

function getCallbackItem(items, name) {

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

    const resultCode =
        Number(
            stkCallback.ResultCode
        );

    const items =
        stkCallback.CallbackMetadata &&
        stkCallback.CallbackMetadata.Item;

    return {
        merchantRequestId:
            stkCallback.MerchantRequestID,

        checkoutRequestId:
            stkCallback.CheckoutRequestID,

        resultCode,

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
// MARK DEPOSIT AS PAID
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

    if (!Number.isFinite(amount) || amount <= 0) {
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
        substation.dailyCashSales.id(saleId);

    if (!sale) {
        throw new Error(
            "Daily cash sale not found."
        );
    }

    if (sale.isDeposited === true) {
        return {
            success: true,
            alreadyDeposited: true
        };
    }

    const expectedAmount =
        Number(sale.amount || 0);

    if (amount !== expectedAmount) {
        throw new Error(
            "M-Pesa payment amount does not match the daily cash sale."
        );
    }

    const saleDate =
        getNairobiDateString(sale.date);

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
        saleId: sale._id,
        amount: expectedAmount
    };
}


// ==========================================================
// HANDLE M-PESA CALLBACK
// ==========================================================

async function handleCallback(body) {

    const callback =
        extractCallback(body);

    // ------------------------------------------------------
    // PAYMENT FAILED / CANCELLED
    // ------------------------------------------------------

    if (callback.resultCode !== 0) {

        return {
            success: false,
            deposited: false,
            resultCode:
                callback.resultCode,
            resultDescription:
                callback.resultDescription
        };
    }

    // ------------------------------------------------------
    // IDENTIFY SALE FROM ACCOUNT REFERENCE
    //
    // CASH-XXXXXXXX
    // ------------------------------------------------------

    const receipt =
        callback.receiptNumber;

    if (!receipt) {
        throw new Error(
            "M-Pesa receipt number missing."
        );
    }

    return {
        success: true,
        deposited: false,
        merchantRequestId:
            callback.merchantRequestId,
        checkoutRequestId:
            callback.checkoutRequestId,
        receiptNumber:
            receipt,
        amount:
            callback.amount,
        phone:
            callback.phone,
        transactionDate:
            callback.transactionDate
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

    cleanPhone
};