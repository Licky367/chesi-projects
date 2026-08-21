// ==========================================================
// services/storage/addNew.js
// ADD ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================
//
// This service is intentionally an adapter around the existing
// storage service. Existing storage/list and storage/contents
// logic remains authoritative for resolving the parent Dairy,
// storage facility and actual storage allocation.
//
// ==========================================================

const storageListService = require("./list");
const storageContentsService = require("./contents");


function serviceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}


function clean(value) {
    return typeof value === "string" ? value.trim() : value;
}


function numberOrUndefined(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        throw serviceError("Numeric fields must contain valid numbers.");
    }

    return number;
}


function getStorageType(storage) {
    return clean(storage?.type);
}


function getBreeds(dairy) {
    if (Array.isArray(dairy?.dairyBreeds)) return dairy.dairyBreeds;
    if (Array.isArray(dairy?.breeds)) return dairy.breeds;
    if (Array.isArray(dairy?.breed)) return dairy.breed;
    return [];
}


async function callService(fn, candidates) {

    if (typeof fn !== "function") {
        throw serviceError(
            "The required storage service operation is not available.",
            500
        );
    }

    let lastError;

    for (const args of candidates) {
        try {
            return await fn(...args);
        } catch (error) {
            lastError = error;

            // Only fall through for argument/signature mismatches.
            // Application validation/database errors must propagate.
            const message = String(error?.message || "");

            const signatureMismatch =
                error?.code === "ERR_INVALID_ARG_TYPE" ||
                message.includes("Cannot read properties of undefined") ||
                message.includes("is not a function");

            if (!signatureMismatch) {
                throw error;
            }
        }
    }

    throw lastError || serviceError(
        "Storage service invocation failed.",
        500
    );
}


async function resolveParentDairy(dairyId) {

    return callService(
        storageListService.getParentDairy,
        [
            [dairyId],
            [{ dairyId }]
        ]
    );
}


async function resolveStorage(dairyId, storageId) {

    const fn =
        storageListService.getStorageFacility ||
        storageListService.getStorage;

    return callService(
        fn,
        [
            [dairyId, storageId],
            [storageId, dairyId],
            [{ dairyId, storageId }],
            [storageId]
        ]
    );
}


async function getAddNewContext({ dairyId, storageId }) {

    if (!dairyId || !storageId) {
        throw serviceError(
            "Dairy and storage identifiers are required.",
            400
        );
    }

    const dairy = await resolveParentDairy(dairyId);
    const storage = await resolveStorage(dairyId, storageId);

    if (!dairy) {
        throw serviceError("Dairy Farm not found.", 404);
    }

    if (!storage) {
        throw serviceError("Storage facility not found.", 404);
    }

    const storageType = getStorageType(storage);

    if (!["room", "agrostore"].includes(storageType)) {
        throw serviceError(
            "This storage facility has an unsupported storage type.",
            400
        );
    }

    return {
        dairy,
        storage,
        storageType,
        dairyBreeds: getBreeds(dairy)
    };
}


function validateAndNormalize({ body, storageType }) {

    const data = { ...body };

    const name = clean(data.name);

    if (!name) {
        throw serviceError("Name is required.");
    }

    data.name = name;

    data.buyingPrice = numberOrUndefined(data.buyingPrice);
    data.currentWorth = numberOrUndefined(data.currentWorth);
    data.mass = numberOrUndefined(data.mass);

    if (data.buyingPrice !== undefined && data.buyingPrice < 0) {
        throw serviceError("Buying Price cannot be negative.");
    }

    if (data.currentWorth !== undefined && data.currentWorth < 0) {
        throw serviceError("Current Worth cannot be negative.");
    }

    if (data.mass !== undefined && data.mass < 0) {
        throw serviceError("Mass cannot be negative.");
    }

    if (storageType === "agrostore") {

        data.recordType = "structure";
        data.type = "feeds";

        data.quantity = numberOrUndefined(data.quantity);
        data.unit = clean(data.unit);

        if (data.quantity === undefined || data.quantity < 0) {
            throw serviceError("Please enter a valid feed quantity.");
        }

        if (!data.unit) {
            throw serviceError("Feed unit is required.");
        }

    } else {

        if (!["animal", "structure"].includes(clean(data.recordType))) {
            throw serviceError("Please select what you are adding.");
        }

        data.recordType = clean(data.recordType);

        if (data.recordType === "animal") {

            data.gender = clean(data.gender);
            data.type = clean(data.type);
            data.dateOfBirth = clean(data.dateOfBirth);

            if (!data.gender) {
                throw serviceError("Animal gender is required.");
            }

            if (!data.dateOfBirth) {
                throw serviceError("Animal Date of Birth is required.");
            }

            if (!data.type) {
                throw serviceError("Animal breed is required.");
            }
        }

        if (data.recordType === "structure" && !clean(data.type)) {
            throw serviceError("Structure type is required.");
        }
    }

    return data;
}


async function addNewItem({
    dairyId,
    storageId,
    body,
    file,
    request
}) {

    const context = await getAddNewContext({
        dairyId,
        storageId
    });

    const data = validateAndNormalize({
        body,
        storageType: context.storageType
    });

    // The browser never controls these destination fields.
    // They are deliberately removed from the submitted payload
    // and the existing contents service is responsible for the
    // final allocation.

    delete data.dairyId;
    delete data.storageId;
    delete data.assetCode;
    delete data.dwellNumber;
    delete data.roomNumber;
    delete data.storage;

    if (file) {
        data.profileImage = file;
    }

    const addItems = storageContentsService.addItemsToStorage;

    if (typeof addItems !== "function") {
        throw serviceError(
            "The existing storage contents add operation is unavailable.",
            500
        );
    }

    const result = await callService(
        addItems,
        [
            [dairyId, storageId, data, request],
            [dairyId, storageId, data],
            [context.dairy, context.storage, data, request],
            [context.dairy, context.storage, data],
            [{
                dairyId,
                storageId,
                data,
                dairy: context.dairy,
                storage: context.storage,
                request
            }]
        ]
    );

    return result || { success: true };
}


module.exports = {
    getAddNewContext,
    addNewItem,
    validateAndNormalize
};