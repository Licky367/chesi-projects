// ==========================================================
// models/dairy.js
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
// ==========================================================
//
// SINGLE SOURCE OF TRUTH
//
// ==========================================================
//
// RECORD TYPE
// ----------------------------------------------------------
//
//     "farm"
//         = Dairy Farm
//
//     "animal"
//         = Identified Dairy / Animal
//
//     "structure"
//         = Structure / Facility / Asset
//
// IMPORTANT:
//
//     recordType MUST NOT be confused with type.
//
// ==========================================================
//
// ENTITY CODE
// ----------------------------------------------------------
//
//     code < 0
//         = Dairy Farm
//
//     code > 0
//         = Identified Animal
//
//     code === null
//         = Code-less Structure / Facility / Asset
//
// ==========================================================
//
// REFERENCE NUMBER
// ----------------------------------------------------------
//
//     code === null
//         = refNo may contain a value
//
//     code !== null
//         = refNo is automatically forced to null
//
// ==========================================================
//
// ASSET OWNERSHIP
// ----------------------------------------------------------
//
//     assetCode
//         = negative code of parent Dairy Farm
//
//     Dairy Farm
//         assetCode = null
//
//     Animal
//         assetCode = negative Dairy Farm code
//
//     Farm-owned Structure / Asset
//         assetCode = negative Dairy Farm code
//
//     Standalone / Assignable Asset
//         assetCode = null
//
// IMPORTANT:
//
//     User assignment is NOT represented by assetCode.
//
//     A standalone asset assigned to a user remains:
//
//         code       = null
//         assetCode  = null
//
//     The assignment is stored in:
//
//         User.assignedAsset[]
//
// ==========================================================
//
// ASSIGNABLE ASSET
// ----------------------------------------------------------
//
// An asset is assignable when:
//
//     recordType === "structure"
//     code === null
//     assetCode === null
//
// Therefore:
//
//     isAssignableAsset === true
//
// These assets may be assigned by an admin to a User through:
//
//     User.assignedAsset
//
// ==========================================================
//
// STORAGE FACILITY
// ----------------------------------------------------------
//
//     recordType = "structure"
//     type       = "room"
//     roomNumber = positive integer
//
//     recordType = "structure"
//     type       = "agroStore"
//     roomNumber = negative integer
//
// ==========================================================
//
// STORAGE CONTENT
// ----------------------------------------------------------
//
//     dwellNumber >= 0
//         = allocated to normal Room
//
//     dwellNumber < 0
//         = allocated to AgroStore
//
//     dwellNumber === null
//         = not currently allocated
//
// ==========================================================
//
// FEED
// ----------------------------------------------------------
//
//     recordType = "structure"
//     type       = "feeds"
//
//     quantity
//         = current stock quantity
//
//     unit
//         = unit of measurement
//
//     stockUpdateNote
//         = latest stock update information
//
//     stockUpdates
//         = stock update history
//
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_PROFILE_IMAGES = 5;


// ==========================================================
// RECORD TYPES
// ==========================================================

const RECORD_TYPES = [

    "farm",
    "animal",
    "structure"

];


// ==========================================================
// DAIRY BREEDS
// ==========================================================

const DAIRY_BREEDS = [

    "Friesian",
    "Ayrshire",
    "Guernsey",
    "Jersey",
    "Brown Swiss",
    "Sahiwal",
    "Boran",
    "Ankole",
    "Fleckvieh",
    "Simmental",
    "Holstein",
    "Crossbreed",
    "Other"

];


// ==========================================================
// DAIRY FARM TYPES
// ==========================================================

const DAIRY_FARM_TYPES = [

    "ranch",
    "zeroGrazing",
    "semiZeroGrazing",
    "pastureBased",
    "mixedFarming",
    "cooperative",
    "other"

];


// ==========================================================
// STRUCTURE TYPES
// ==========================================================

const STRUCTURE_TYPES = [

    "room",
    "agroStore",

    "machine",
    "equipment",
    "tool",
    "building",
    "cowshed",
    "milkingParlour",
    "hayShed",
    "waterSystem",
    "fencing",
    "vehicle",
    "generator",
    "solarSystem",
    "feedStore",

    "feeds",

    "other"

];


// ==========================================================
// STORAGE TYPES
// ==========================================================

const STORAGE_TYPES = [

    "room",
    "agroStore"

];


// ==========================================================
// FEED TYPE
// ==========================================================

const FEED_TYPE =
    "feeds";


// ==========================================================
// DAIRY STATUSES
// ==========================================================

const DAIRY_STATUSES = [

    "active",
    "sold",
    "disposed",
    "inactive"

];


// ==========================================================
// HELPER: INTEGER OR NULL
// ==========================================================

function isIntegerOrNull(value) {

    return (

        value === null ||
        value === undefined ||
        Number.isInteger(value)

    );

}


// ==========================================================
// HELPER: NEGATIVE INTEGER OR NULL
// ==========================================================

function isNegativeIntegerOrNull(value) {

    return (

        value === null ||
        value === undefined ||
        (
            Number.isInteger(value) &&
            value < 0
        )

    );

}


// ==========================================================
// HELPER: VALID ROOM NUMBER
// ==========================================================

function isValidRoomNumber(value) {

    return (

        Number.isInteger(value) &&
        value > 0

    );

}


// ==========================================================
// HELPER: VALID AGROSTORE NUMBER
// ==========================================================

function isValidAgroStoreNumber(value) {

    return (

        Number.isInteger(value) &&
        value < 0

    );

}


// ==========================================================
// HELPER: VALID FARM CODE
// ==========================================================

function isValidFarmCode(value) {

    return (

        Number.isInteger(value) &&
        value < 0

    );

}


// ==========================================================
// HELPER: VALID DWELL NUMBER
// ==========================================================

function isValidDwellNumber(value) {

    return (

        value === null ||
        value === undefined ||
        Number.isInteger(value)

    );

}


// ==========================================================
// HELPER: NORMALIZE PROFILE IMAGE
// ==========================================================

function normalizeProfileImage(
    image,
    name
) {

    const fallback =
        "https://ui-avatars.com/api/?name=" +
        `${encodeURIComponent(
            name || "Dairy"
        )}`;


    if (!image) {

        return fallback;

    }


    const value =
        String(image).trim();


    if (!value) {

        return fallback;

    }


    return value;

}


// ==========================================================
// HELPER: FEMALE ANIMAL
// ==========================================================

function isFemaleAnimalCode(code) {

    return (

        Number.isInteger(code) &&
        code > 0 &&
        code % 2 === 0

    );

}


// ==========================================================
// FEMALE-ONLY BOOLEAN FIELDS
// ==========================================================

const FEMALE_BOOLEAN_FIELDS = [

    "isMilking",
    "isBred",
    "isInCalf",
    "isComingIntoHeat",
    "isInHeat",
    "isDry",
    "isCloseToCalving",
    "hasCalved",
    "isLactating",
    "isWeaned",
    "isSick",
    "isUnderTreatment",
    "isOnMedication",
    "isQuarantined",
    "isForSale",
    "isSold"

];


// ==========================================================
// STOCK UPDATE SCHEMA
// ==========================================================

const stockUpdateSchema =
    new mongoose.Schema(

        {

            quantity: {

                type: Number,

                min: 0,

                required: true

            },


            stockUpdateNote: {

                type: String,

                trim: true,

                default: "",

                maxlength: 5000

            },


            images: {

                type: [

                    mongoose.Schema.Types.Mixed

                ],

                default: []

            },


            recordedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            recordedAt: {

                type: Date,

                default: Date.now

            }

        },

        {

            _id: true,

            timestamps: false,

            minimize: false

        }

    );


// ==========================================================
// MAIN DAIRY SCHEMA
// ==========================================================

const dairySchema =
    new mongoose.Schema(

        {

            // ==================================================
            // RECORD TYPE
            // ==================================================

            recordType: {

                type: String,

                enum: RECORD_TYPES,

                default: null,

                trim: true

            },


            // ==================================================
            // PROFILE IMAGES
            // ==================================================

            profileImages: {

                type: [

                    {

                        type: String,

                        trim: true

                    }

                ],

                default: [],

                validate: {

                    validator:
                        function (images) {

                            return (

                                Array.isArray(images) &&
                                images.length <=
                                    MAX_PROFILE_IMAGES

                            );

                        },

                    message:
                        `A maximum of ${MAX_PROFILE_IMAGES} profile images is allowed.`

                }

            },


            // ==================================================
            // PRIMARY / LEGACY PROFILE IMAGE
            // ==================================================

            profileImage: {

                type: String,

                trim: true,

                default: ""

            },


            // ==================================================
            // ENTITY CODE
            // ==================================================

            code: {

                type: Number,

                default: null,

                validate: {

                    validator:
                        function (value) {

                            return isIntegerOrNull(
                                value
                            );

                        },

                    message:
                        "Code must be a whole number or null."

                }

            },


            // ==================================================
            // REFERENCE NUMBER
            // ==================================================

            refNo: {

                type: String,

                trim: true,

                default: null,

                maxlength: 100

            },


            // ==================================================
            // ABOUT
            // ==================================================

            about: {

                type: String,

                trim: true,

                default: "",

                maxlength: 10000

            },


            // ==================================================
            // MISSION
            // ==================================================

            mission: {

                type: String,

                trim: true,

                default: "",

                maxlength: 10000

            },


            // ==================================================
            // VISION
            // ==================================================

            vision: {

                type: String,

                trim: true,

                default: "",

                maxlength: 10000

            },


            // ==================================================
            // NAME
            // ==================================================

            name: {

                type: String,

                required: true,

                trim: true,

                maxlength: 200

            },


            // ==================================================
            // DATE OF BIRTH
            // ==================================================

            dateOfBirth: {

                type: Date,

                default: null

            },


            // ==================================================
            // MASS
            // ==================================================

            mass: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // FEMALE / ANIMAL STATUS FIELDS
            // ==================================================

            isMilking: {

                type: Boolean,

                default: false

            },

            isBred: {

                type: Boolean,

                default: false

            },

            isInCalf: {

                type: Boolean,

                default: false

            },

            isComingIntoHeat: {

                type: Boolean,

                default: false

            },

            isInHeat: {

                type: Boolean,

                default: false

            },

            isDry: {

                type: Boolean,

                default: false

            },

            isCloseToCalving: {

                type: Boolean,

                default: false

            },

            hasCalved: {

                type: Boolean,

                default: false

            },

            isLactating: {

                type: Boolean,

                default: false

            },

            isWeaned: {

                type: Boolean,

                default: false

            },

            isSick: {

                type: Boolean,

                default: false

            },

            isUnderTreatment: {

                type: Boolean,

                default: false

            },

            isOnMedication: {

                type: Boolean,

                default: false

            },

            isQuarantined: {

                type: Boolean,

                default: false

            },

            isForSale: {

                type: Boolean,

                default: false

            },

            isSold: {

                type: Boolean,

                default: false

            },


            // ==================================================
            // PARENT FARM CODE
            // ==================================================
            //
            // IMPORTANT:
            //
            // This is ownership/location relationship.
            //
            // It is NOT user assignment.
            //
            // A standalone asset assigned to a worker still
            // keeps assetCode = null.
            //
            // ==================================================

            assetCode: {

                type: Number,

                default: null,

                validate: {

                    validator:
                        function (value) {

                            return isNegativeIntegerOrNull(
                                value
                            );

                        },

                    message:
                        "assetCode must be a negative Dairy Farm code or null."

                }

            },


            // ==================================================
            // STORAGE FACILITY NUMBER
            // ==================================================

            roomNumber: {

                type: Number,

                default: null,

                validate: {

                    validator:
                        function (value) {

                            if (
                                this.recordType !==
                                "structure"
                            ) {

                                return (
                                    value === null ||
                                    value === undefined
                                );

                            }


                            if (
                                this.type === "room"
                            ) {

                                return isValidRoomNumber(
                                    value
                                );

                            }


                            if (
                                this.type === "agroStore"
                            ) {

                                return isValidAgroStoreNumber(
                                    value
                                );

                            }


                            return (
                                value === null ||
                                value === undefined
                            );

                        },

                    message:
                        function () {

                            if (
                                this.type === "room"
                            ) {

                                return (
                                    "A room must have a positive integer roomNumber."
                                );

                            }


                            if (
                                this.type === "agroStore"
                            ) {

                                return (
                                    "An AgroStore must have a negative integer roomNumber."
                                );

                            }


                            return (
                                "Non-storage records must not have a roomNumber."
                            );

                        }

                }

            },


            // ==================================================
            // STORAGE DWELL NUMBER
            // ==================================================

            dwellNumber: {

                type: Number,

                default: null,

                validate: {

                    validator:
                        function (value) {

                            return isValidDwellNumber(
                                value
                            );

                        },

                    message:
                        "dwellNumber must be a whole number or null."

                }

            },


            // ==================================================
            // FEED QUANTITY
            // ==================================================

            quantity: {

                type: Number,

                min: 0,

                default: null

            },


            // ==================================================
            // FEED UNIT
            // ==================================================

            unit: {

                type: String,

                trim: true,

                default: null,

                maxlength: 50

            },


            // ==================================================
            // CURRENT STOCK UPDATE NOTE
            // ==================================================

            stockUpdateNote: {

                type: String,

                trim: true,

                default: "",

                maxlength: 5000

            },


            // ==================================================
            // STOCK UPDATE HISTORY
            // ==================================================

            stockUpdates: {

                type: [

                    stockUpdateSchema

                ],

                default: []

            },


            // ==================================================
            // MAINTENANCE FLAG
            // ==================================================

            needsMaintenance: {

                type: Boolean,

                default: false

            },


            // ==================================================
            // MAINTENANCE
            // ==================================================

            maintenance: {

                type: {

                    type: String,

                    trim: true,

                    default: ""

                },

                description: {

                    type: String,

                    trim: true,

                    default: ""

                },

                charges: {

                    type: Number,

                    min: 0,

                    default: 0

                },

                completionDescription: {

                    type: String,

                    trim: true,

                    default: ""

                },

                markedBy: {

                    type:
                        mongoose.Schema.Types.ObjectId,

                    ref: "User",

                    default: null

                },

                markedAt: {

                    type: Date,

                    default: null

                },

                clearedBy: {

                    type:
                        mongoose.Schema.Types.ObjectId,

                    ref: "User",

                    default: null

                },

                clearedAt: {

                    type: Date,

                    default: null

                }

            },


            // ==================================================
            // MEDICAL ATTENTION
            // ==================================================

            medicalAttention: {

                isMarked: {

                    type: Boolean,

                    default: false

                },

                type: {

                    type: String,

                    trim: true,

                    default: ""

                },

                details: {

                    type: String,

                    trim: true,

                    default: ""

                },

                charges: {

                    type: Number,

                    min: 0,

                    default: 0

                },

                description: {

                    type: String,

                    trim: true,

                    default: ""

                },

                markedBy: {

                    type:
                        mongoose.Schema.Types.ObjectId,

                    ref: "User",

                    default: null

                },

                markedAt: {

                    type: Date,

                    default: null

                },

                clearedBy: {

                    type:
                        mongoose.Schema.Types.ObjectId,

                    ref: "User",

                    default: null

                },

                clearedAt: {

                    type: Date,

                    default: null

                },

                updatedAt: {

                    type: Date,

                    default: null

                }

            },


            // ==================================================
            // SPECIFIC TYPE
            // ==================================================

            type: {

                type: String,

                trim: true,

                default: ""

            },


            // ==================================================
            // BUYING PRICE
            // ==================================================

            buyingPrice: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // SELLING PRICE
            // ==================================================

            sellingPrice: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // REVENUE
            // ==================================================

            revenue: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // CURRENT WORTH
            // ==================================================

            currentWorth: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {

                type: String,

                trim: true,

                default: "",

                maxlength: 5000

            },


            // ==================================================
            // CONDITION
            // ==================================================

            condition: {

                type: String,

                trim: true,

                default: "",

                maxlength: 500

            },


            // ==================================================
            // LOCATION
            // ==================================================

            location: {

                type: String,

                trim: true,

                default: "",

                maxlength: 500

            },


            // ==================================================
            // ACQUISITION DATE
            // ==================================================

            acquisitionDate: {

                type: Date,

                default: null

            },


            // ==================================================
            // VALUATION DATE
            // ==================================================

            valuationDate: {

                type: Date,

                default: null

            },


            // ==================================================
            // STATUS
            // ==================================================

            status: {

                type: String,

                enum: DAIRY_STATUSES,

                default: "active"

            }

        },

        {

            timestamps: true,

            minimize: false,

            toJSON: {

                virtuals: true

            },

            toObject: {

                virtuals: true

            }

        }

    );


// ==========================================================
// VIRTUAL: IS DAIRY FARM
// ==========================================================

dairySchema.virtual(
    "isDairyFarm"
).get(function () {

    return this.recordType === "farm";

});


// ==========================================================
// VIRTUAL: IS ANIMAL
// ==========================================================

dairySchema.virtual(
    "isAnimal"
).get(function () {

    return this.recordType === "animal";

});


// ==========================================================
// VIRTUAL: IS STRUCTURE
// ==========================================================

dairySchema.virtual(
    "isStructure"
).get(function () {

    return this.recordType === "structure";

});


// ==========================================================
// VIRTUAL: IS CODE-LESS
// ==========================================================

dairySchema.virtual(
    "isCodeLess"
).get(function () {

    return (

        this.code === null ||
        this.code === undefined

    );

});


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
// ==========================================================
//
// Legacy-compatible name.
//
// A manual/standalone asset is a structure with:
//
//     code      = null
//     assetCode = null
//
// ==========================================================

dairySchema.virtual(
    "isManualAsset"
).get(function () {

    return (

        this.isStructure &&
        this.isCodeLess &&
        (
            this.assetCode === null ||
            this.assetCode === undefined
        )

    );

});


// ==========================================================
// VIRTUAL: IS ASSIGNABLE ASSET
// ==========================================================
//
// THIS IS THE NEW ARCHITECTURAL DEFINITION.
//
// An assignable asset:
//
//     - is a structure
//     - has no entity code
//     - has no parent farm assetCode
//
// Assignment to a user is stored separately in:
//
//     User.assignedAsset[]
//
// Assigning it to a user does NOT modify this Dairy document.
//
// ==========================================================

dairySchema.virtual(
    "isAssignableAsset"
).get(function () {

    return (

        this.isStructure &&
        this.isCodeLess &&
        (
            this.assetCode === null ||
            this.assetCode === undefined
        )

    );

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
// ==========================================================
//
// IMPORTANT:
//
// This means the asset is associated with a parent farm.
//
// It does NOT mean User.assignedAsset.
//
// User assignment is determined from the User document.
//
// ==========================================================

dairySchema.virtual(
    "isAssignedAsset"
).get(function () {

    return (

        this.isStructure &&
        this.assetCode !== null &&
        this.assetCode !== undefined

    );

});


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================
//
// Compatibility alias for existing code.
//
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
).get(function () {

    return this.isAssignableAsset;

});


// ==========================================================
// VIRTUAL: HAS REFERENCE NUMBER
// ==========================================================

dairySchema.virtual(
    "hasRefNo"
).get(function () {

    return (

        this.isCodeLess &&
        !!String(
            this.refNo || ""
        ).trim()

    );

});


// ==========================================================
// VIRTUAL: IS STORAGE FACILITY
// ==========================================================

dairySchema.virtual(
    "isStorageFacility"
).get(function () {

    return (

        this.isStructure &&
        STORAGE_TYPES.includes(
            this.type
        ) &&
        this.roomNumber !== null &&
        this.roomNumber !== undefined

    );

});


// ==========================================================
// VIRTUAL: IS STORAGE CONTENT
// ==========================================================

dairySchema.virtual(
    "isStorageContent"
).get(function () {

    return (

        this.dwellNumber !== null &&
        this.dwellNumber !== undefined &&
        !this.isStorageFacility

    );

});


// ==========================================================
// VIRTUAL: IS DWELLING
// ==========================================================

dairySchema.virtual(
    "isDwelling"
).get(function () {

    return (

        this.dwellNumber !== null &&
        this.dwellNumber !== undefined

    );

});


// ==========================================================
// VIRTUAL: IS NORMAL ROOM
// ==========================================================

dairySchema.virtual(
    "isNormalRoom"
).get(function () {

    return (

        this.isStructure &&
        this.type === "room"

    );

});


// ==========================================================
// VIRTUAL: IS ROOM
// ==========================================================

dairySchema.virtual(
    "isRoom"
).get(function () {

    return this.isNormalRoom;

});


// ==========================================================
// VIRTUAL: IS AGROSTORE
// ==========================================================

dairySchema.virtual(
    "isAgroStore"
).get(function () {

    return (

        this.isStructure &&
        this.type === "agroStore"

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE CONTENT
// ==========================================================

dairySchema.virtual(
    "isAgroStoreContent"
).get(function () {

    return (

        this.dwellNumber !== null &&
        this.dwellNumber !== undefined &&
        Number(this.dwellNumber) < 0 &&
        !this.isStorageFacility

    );

});


// ==========================================================
// VIRTUAL: STORAGE DWELL NUMBER
// ==========================================================

dairySchema.virtual(
    "storageDwellNumber"
).get(function () {

    return this.isAgroStoreContent

        ? Number(this.dwellNumber)

        : null;

});


// ==========================================================
// VIRTUAL: HAS NEGATIVE DWELL
// ==========================================================

dairySchema.virtual(
    "hasNegativeDwell"
).get(function () {

    return this.isAgroStoreContent;

});


// ==========================================================
// VIRTUAL: IS FEED
// ==========================================================

dairySchema.virtual(
    "isFeed"
).get(function () {

    return (

        String(this.type || "")
            .trim()
            .toLowerCase() ===
            FEED_TYPE

    );

});


// ==========================================================
// VIRTUAL: HAS FEED QUANTITY
// ==========================================================

dairySchema.virtual(
    "hasFeedQuantity"
).get(function () {

    return (

        this.isFeed &&
        Number.isFinite(
            Number(this.quantity)
        )

    );

});


// ==========================================================
// VIRTUAL: FEED QUANTITY TEXT
// ==========================================================

dairySchema.virtual(
    "feedQuantityText"
).get(function () {

    if (!this.isFeed) {

        return "";

    }


    if (
        this.quantity === null ||
        this.quantity === undefined
    ) {

        return "";

    }


    const quantity =
        Number(this.quantity);


    if (!Number.isFinite(quantity)) {

        return "";

    }


    return (

        `${quantity}` +
        (
            this.unit
                ? ` ${this.unit}`
                : ""
        )

    );

});


// ==========================================================
// VIRTUAL: PARENT FARM CODE
// ==========================================================

dairySchema.virtual(
    "parentFarmCode"
).get(function () {

    if (this.isDairyFarm) {

        return this.code;

    }


    if (
        this.assetCode !== null &&
        this.assetCode !== undefined
    ) {

        return this.assetCode;

    }


    return null;

});


// ==========================================================
// VIRTUAL: GENDER
// ==========================================================

dairySchema.virtual(
    "gender"
).get(function () {

    if (!this.isAnimal) {

        return null;

    }


    return (

        Number(this.code) % 2 === 0

            ? "Female"

            : "Male"

    );

});


// ==========================================================
// VIRTUAL: IS FEMALE
// ==========================================================

dairySchema.virtual(
    "isFemale"
).get(function () {

    return (

        this.isAnimal &&
        isFemaleAnimalCode(
            Number(this.code)
        )

    );

});


// ==========================================================
// VIRTUAL: IS MALE
// ==========================================================

dairySchema.virtual(
    "isMale"
).get(function () {

    return (

        this.isAnimal &&
        Number.isInteger(
            Number(this.code)
        ) &&
        Number(this.code) > 0 &&
        Number(this.code) % 2 !== 0

    );

});


// ==========================================================
// VIRTUAL: HAS IDENTITY
// ==========================================================

dairySchema.virtual(
    "hasIdentity"
).get(function () {

    return this.isAnimal;

});


// ==========================================================
// VIRTUAL: AGE TEXT
// ==========================================================

dairySchema.virtual(
    "ageText"
).get(function () {

    if (!this.dateOfBirth) {

        return "";

    }


    const dob =
        new Date(
            this.dateOfBirth
        );

    const now =
        new Date();


    if (
        Number.isNaN(
            dob.getTime()
        ) ||
        dob > now
    ) {

        return "";

    }


    let years =
        now.getFullYear() -
        dob.getFullYear();

    let months =
        now.getMonth() -
        dob.getMonth();

    let days =
        now.getDate() -
        dob.getDate();


    if (days < 0) {

        months--;


        const previousMonth =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                0
            );


        days +=
            previousMonth.getDate();

    }


    if (months < 0) {

        years--;

        months += 12;

    }


    return (

        `${years} years, ` +
        `${months} months, ` +
        `${days} days`

    );

});


// ==========================================================
// VIRTUAL: AGE YEARS
// ==========================================================

dairySchema.virtual(
    "ageYears"
).get(function () {

    if (!this.dateOfBirth) {

        return null;

    }


    const dob =
        new Date(
            this.dateOfBirth
        );

    const now =
        new Date();


    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return null;

    }


    let age =
        now.getFullYear() -
        dob.getFullYear();


    const monthDifference =
        now.getMonth() -
        dob.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            now.getDate() <
                dob.getDate()
        )
    ) {

        age--;

    }


    return Math.max(
        0,
        age
    );

});


// ==========================================================
// VIRTUAL: MILKING TEXT
// ==========================================================

dairySchema.virtual(
    "isMilkingText"
).get(function () {

    return this.isMilking
        ? "Yes"
        : "No";

});


// ==========================================================
// VIRTUAL: DISPLAY IMAGES
// ==========================================================

dairySchema.virtual(
    "displayImages"
).get(function () {

    let images = [];


    if (
        Array.isArray(
            this.profileImages
        )
    ) {

        images =
            this.profileImages
                .filter(Boolean)
                .map(
                    image =>
                        normalizeProfileImage(
                            image,
                            this.name
                        )
                );

    }


    if (
        images.length === 0 &&
        this.profileImage
    ) {

        images.push(
            normalizeProfileImage(
                this.profileImage,
                this.name
            )
        );

    }


    if (
        images.length === 0
    ) {

        images.push(
            normalizeProfileImage(
                "",
                this.name
            )
        );

    }


    return images.slice(
        0,
        MAX_PROFILE_IMAGES
    );

});


// ==========================================================
// VIRTUAL: DISPLAY IMAGE
// ==========================================================

dairySchema.virtual(
    "displayImage"
).get(function () {

    const images =
        this.displayImages;


    return images.length

        ? images[0]

        : normalizeProfileImage(
            "",
            this.name
        );

});


// ==========================================================
// VIRTUAL: REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual(
    "requiresMaintenance"
).get(function () {

    return !!this.needsMaintenance;

});


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual(
    "needsMedicalAttention"
).get(function () {

    return !!(

        this.medicalAttention &&
        this.medicalAttention.isMarked

    );

});


// ==========================================================
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual(
    "assetValue"
).get(function () {

    return Number(
        this.currentWorth
    ) || 0;

});


// ==========================================================
// VIRTUAL: ACTIVE ASSET
// ==========================================================

dairySchema.virtual(
    "isActiveAsset"
).get(function () {

    return this.status === "active";

});


// ==========================================================
// VIRTUAL: IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual(
    "isIdentifiedDairy"
).get(function () {

    return this.isAnimal;

});


// ==========================================================
// PRE-VALIDATE
// ==========================================================

dairySchema.pre(
    "validate",
    function (next) {

        // ======================================================
        // PROFILE IMAGES
        // ======================================================

        if (
            !Array.isArray(
                this.profileImages
            )
        ) {

            this.profileImages = [];

        }


        this.profileImages =
            this.profileImages
                .filter(Boolean)
                .map(
                    image =>
                        String(image).trim()
                )
                .filter(Boolean)
                .slice(
                    0,
                    MAX_PROFILE_IMAGES
                );


        // ======================================================
        // LEGACY PROFILE IMAGE MIGRATION
        // ======================================================

        if (
            this.profileImages.length === 0 &&
            this.profileImage
        ) {

            this.profileImages = [

                String(
                    this.profileImage
                ).trim()

            ];

        }


        // ======================================================
        // PRIMARY PROFILE IMAGE
        // ======================================================

        if (
            this.profileImages.length > 0
        ) {

            this.profileImage =
                this.profileImages[0];

        } else {

            this.profileImage = "";

        }


        // ======================================================
        // NORMALIZE NULLABLE VALUES
        // ======================================================

        if (
            this.code === undefined
        ) {

            this.code = null;

        }


        if (
            this.assetCode === undefined
        ) {

            this.assetCode = null;

        }


        if (
            this.roomNumber === undefined
        ) {

            this.roomNumber = null;

        }


        if (
            this.dwellNumber === undefined
        ) {

            this.dwellNumber = null;

        }


        // ======================================================
        // NORMALIZE REFERENCE NUMBER
        // ======================================================

        if (
            this.refNo === undefined ||
            this.refNo === null
        ) {

            this.refNo = null;

        } else {

            this.refNo =
                String(
                    this.refNo
                ).trim();


            if (!this.refNo) {

                this.refNo = null;

            }

        }


        // ======================================================
        // CODE / REFERENCE NUMBER RULE
        // ======================================================

        if (
            this.code !== null &&
            this.code !== undefined
        ) {

            this.refNo = null;

        }


        // ======================================================
        // NORMALIZE ABOUT / MISSION / VISION
        // ======================================================

        this.about =
            String(
                this.about || ""
            ).trim();


        this.mission =
            String(
                this.mission || ""
            ).trim();


        this.vision =
            String(
                this.vision || ""
            ).trim();


        // ======================================================
        // NORMALIZE TYPE
        // ======================================================

        if (
            typeof this.type === "string"
        ) {

            this.type =
                this.type.trim();

        }


        // ======================================================
        // NORMALIZE STOCK UPDATE NOTE
        // ======================================================

        if (
            this.stockUpdateNote === null ||
            this.stockUpdateNote === undefined
        ) {

            this.stockUpdateNote = "";

        } else {

            this.stockUpdateNote =
                String(
                    this.stockUpdateNote
                ).trim();

        }


        // ======================================================
        // NORMALIZE STOCK UPDATE HISTORY
        // ======================================================

        if (
            !Array.isArray(
                this.stockUpdates
            )
        ) {

            this.stockUpdates = [];

        }


        this.stockUpdates.forEach(
            update => {

                if (
                    update.quantity === null ||
                    update.quantity === undefined
                ) {

                    update.quantity = 0;

                }


                update.quantity =
                    Number(
                        update.quantity
                    );


                if (
                    !Number.isFinite(
                        update.quantity
                    ) ||
                    update.quantity < 0
                ) {

                    update.quantity = 0;

                }


                update.stockUpdateNote =
                    String(
                        update.stockUpdateNote ||
                        ""
                    ).trim();


                if (
                    !update.recordedAt
                ) {

                    update.recordedAt =
                        new Date();

                }

            }
        );


        // ======================================================
        // DETERMINE RECORD TYPE
        // ======================================================

        if (
            !this.recordType
        ) {

            if (
                this.code !== null &&
                this.code !== undefined
            ) {

                if (
                    Number(this.code) < 0
                ) {

                    this.recordType =
                        "farm";

                } else if (
                    Number(this.code) > 0
                ) {

                    this.recordType =
                        "animal";

                }

            } else {

                this.recordType =
                    "structure";

            }

        }


        // ======================================================
        // VALID RECORD TYPE
        // ======================================================

        if (
            !RECORD_TYPES.includes(
                this.recordType
            )
        ) {

            const error =
                new Error(
                    `Invalid recordType: ${this.recordType}.`
                );

            error.status = 400;

            return next(error);

        }


        // ======================================================
        // FARM
        // ======================================================

        if (
            this.recordType === "farm"
        ) {

            if (
                !isValidFarmCode(
                    this.code
                )
            ) {

                const error =
                    new Error(
                        "A farm record must have a negative integer code."
                    );

                error.status = 400;

                return next(error);

            }


            if (
                this.type &&
                !DAIRY_FARM_TYPES.includes(
                    this.type
                )
            ) {

                const error =
                    new Error(
                        `Invalid dairy farm type: ${this.type}.`
                    );

                error.status = 400;

                return next(error);

            }


            this.refNo = null;

            this.assetCode = null;

            this.roomNumber = null;

            this.dwellNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] = false;

                }
            );

        }


        // ======================================================
        // ANIMAL
        // ======================================================

        if (
            this.recordType === "animal"
        ) {

            if (
                this.code === null ||
                this.code === undefined ||
                !Number.isInteger(
                    this.code
                ) ||
                Number(this.code) <= 0
            ) {

                const error =
                    new Error(
                        "An animal record must have a positive integer code."
                    );

                error.status = 400;

                return next(error);

            }


            this.refNo = null;


            if (
                !this.assetCode ||
                !isValidFarmCode(
                    this.assetCode
                )
            ) {

                const error =
                    new Error(
                        "Animal must belong to a Dairy Farm through a negative assetCode."
                    );

                error.status = 400;

                return next(error);

            }


            if (
                this.type &&
                !DAIRY_BREEDS.includes(
                    this.type
                )
            ) {

                const error =
                    new Error(
                        `Invalid dairy breed: ${this.type}.`
                    );

                error.status = 400;

                return next(error);

            }


            const female =
                isFemaleAnimalCode(
                    Number(this.code)
                );


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] =
                        female
                            ? !!this[field]
                            : false;

                }
            );


            this.roomNumber = null;

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];

        }


        // ======================================================
        // STRUCTURE
        // ======================================================

        if (
            this.recordType === "structure"
        ) {

            if (
                this.code !== null &&
                this.code !== undefined
            ) {

                const error =
                    new Error(
                        "A structure record must have code set to null."
                    );

                error.status = 400;

                return next(error);

            }


            this.dateOfBirth = null;

            this.mass = 0;


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] = false;

                }
            );


            if (
                this.type &&
                !STRUCTURE_TYPES.includes(
                    this.type
                )
            ) {

                const error =
                    new Error(
                        `Invalid structure type: ${this.type}.`
                    );

                error.status = 400;

                return next(error);

            }


            // --------------------------------------------------
            // Farm-owned structure
            // --------------------------------------------------

            if (
                this.assetCode !== null &&
                this.assetCode !== undefined
            ) {

                if (
                    !isValidFarmCode(
                        this.assetCode
                    )
                ) {

                    const error =
                        new Error(
                            "Structure assetCode must be the negative code of its parent Dairy Farm."
                        );

                    error.status = 400;

                    return next(error);

                }

            }


            // ==================================================
            // STORAGE FACILITY
            // ==================================================

            if (
                this.type === "room"
            ) {

                if (
                    !isValidRoomNumber(
                        this.roomNumber
                    )
                ) {

                    const error =
                        new Error(
                            "A Room must have an autogenerated positive integer roomNumber."
                        );

                    error.status = 400;

                    return next(error);

                }


                this.dwellNumber = null;

            }


            if (
                this.type === "agroStore"
            ) {

                if (
                    !isValidAgroStoreNumber(
                        this.roomNumber
                    )
                ) {

                    const error =
                        new Error(
                            "An AgroStore must have an autogenerated negative integer roomNumber."
                        );

                    error.status = 400;

                    return next(error);

                }


                this.dwellNumber = null;

            }


            // ==================================================
            // NON-STORAGE STRUCTURE
            // ==================================================

            if (
                !STORAGE_TYPES.includes(
                    this.type
                )
            ) {

                this.roomNumber = null;

            }

        }


        // ======================================================
        // DWELL NUMBER
        // ======================================================

        if (
            !isValidDwellNumber(
                this.dwellNumber
            )
        ) {

            const error =
                new Error(
                    "dwellNumber must be a whole number or null."
                );

            error.status = 400;

            return next(error);

        }


        // ======================================================
        // STORAGE DIRECTION VALIDATION
        // ======================================================

        if (
            this.dwellNumber !== null &&
            this.dwellNumber !== undefined
        ) {

            if (
                this.isStorageFacility
            ) {

                const error =
                    new Error(
                        "A storage facility cannot itself be allocated to storage."
                    );

                error.status = 400;

                return next(error);

            }

        }


        // ======================================================
        // MEDICAL ATTENTION NORMALIZATION
        // ======================================================

        if (
            !this.medicalAttention
        ) {

            this.medicalAttention = {};

        }


        this.medicalAttention.isMarked =
            !!this.medicalAttention.isMarked;


        this.medicalAttention.type =
            String(
                this.medicalAttention.type || ""
            ).trim();


        this.medicalAttention.details =
            String(
                this.medicalAttention.details || ""
            ).trim();


        this.medicalAttention.charges =
            Math.max(
                0,
                Number(
                    this.medicalAttention.charges
                ) || 0
            );


        this.medicalAttention.description =
            String(
                this.medicalAttention.description || ""
            ).trim();


        this.medicalAttention.markedBy =
            this.medicalAttention.markedBy ||
            null;


        this.medicalAttention.markedAt =
            this.medicalAttention.markedAt ||
            null;


        this.medicalAttention.updatedAt =
            this.medicalAttention.updatedAt ||
            null;


        this.medicalAttention.clearedBy =
            this.medicalAttention.clearedBy ||
            null;


        this.medicalAttention.clearedAt =
            this.medicalAttention.clearedAt ||
            null;


        // ======================================================
        // CLEAR MEDICAL DATA WHEN NOT MARKED
        // ======================================================

        if (
            !this.medicalAttention.isMarked
        ) {

            this.medicalAttention.type = "";

            this.medicalAttention.details = "";

            this.medicalAttention.charges = 0;

            this.medicalAttention.description = "";

            this.medicalAttention.markedBy = null;

            this.medicalAttention.markedAt = null;

        }


        // ======================================================
        // FEED NORMALIZATION
        // ======================================================

        const isFeed =
            this.isFeed;


        if (
            isFeed
        ) {

            if (
                this.recordType !== "structure"
            ) {

                const error =
                    new Error(
                        'Feed records must have recordType set to "structure".'
                    );

                error.status = 400;

                return next(error);

            }


            if (
                this.quantity === null ||
                this.quantity === undefined ||
                this.quantity === ""
            ) {

                this.quantity = 0;

            }


            const numericQuantity =
                Number(
                    this.quantity
                );


            if (
                !Number.isFinite(
                    numericQuantity
                )
            ) {

                const error =
                    new Error(
                        "Feed quantity must be a valid number."
                    );

                error.status = 400;

                return next(error);

            }


            if (
                numericQuantity < 0
            ) {

                const error =
                    new Error(
                        "Feed quantity cannot be negative."
                    );

                error.status = 400;

                return next(error);

            }


            this.quantity =
                numericQuantity;


            if (
                this.unit !== null &&
                this.unit !== undefined
            ) {

                this.unit =
                    String(
                        this.unit
                    ).trim();


                if (!this.unit) {

                    this.unit = null;

                }

            }


            this.stockUpdateNote =
                String(
                    this.stockUpdateNote || ""
                ).trim();

        } else {

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];

        }


        next();

    }
);


// ==========================================================
// PRE-SAVE
// ==========================================================

dairySchema.pre(
    "save",
    function (next) {

        // ======================================================
        // REFERENCE NUMBER FINAL RULE
        // ======================================================

        if (
            this.code !== null &&
            this.code !== undefined
        ) {

            this.refNo = null;

        } else {

            if (
                this.refNo !== null &&
                this.refNo !== undefined
            ) {

                this.refNo =
                    String(
                        this.refNo
                    ).trim();


                if (!this.refNo) {

                    this.refNo = null;

                }

            }

        }


        // ======================================================
        // ABOUT / MISSION / VISION
        // ======================================================

        this.about =
            String(
                this.about || ""
            ).trim();


        this.mission =
            String(
                this.mission || ""
            ).trim();


        this.vision =
            String(
                this.vision || ""
            ).trim();


        // ======================================================
        // MEDICAL UPDATED DATE
        // ======================================================

        if (
            this.isModified(
                "medicalAttention"
            ) &&
            this.medicalAttention
        ) {

            this.medicalAttention.updatedAt =
                new Date();

        }


        // ======================================================
        // ACQUISITION DATE
        // ======================================================

        if (
            !this.acquisitionDate
        ) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        // ======================================================
        // STOCK UPDATE NOTE
        // ======================================================

        this.stockUpdateNote =
            String(
                this.stockUpdateNote || ""
            ).trim();


        // ======================================================
        // STOCK UPDATE HISTORY
        // ======================================================

        if (
            !Array.isArray(
                this.stockUpdates
            )
        ) {

            this.stockUpdates = [];

        }


        this.stockUpdates.forEach(
            update => {

                update.quantity =
                    Number(
                        update.quantity
                    );


                if (
                    !Number.isFinite(
                        update.quantity
                    ) ||
                    update.quantity < 0
                ) {

                    update.quantity = 0;

                }


                update.stockUpdateNote =
                    String(
                        update.stockUpdateNote ||
                        ""
                    ).trim();


                if (
                    !update.recordedAt
                ) {

                    update.recordedAt =
                        new Date();

                }

            }
        );


        // ======================================================
        // FARM NORMALIZATION
        // ======================================================

        if (
            this.recordType === "farm"
        ) {

            this.refNo = null;

            this.assetCode = null;

            this.roomNumber = null;

            this.dwellNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] = false;

                }
            );

        }


        // ======================================================
        // ANIMAL NORMALIZATION
        // ======================================================

        if (
            this.recordType === "animal"
        ) {

            this.refNo = null;

            this.roomNumber = null;

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];


            const female =
                isFemaleAnimalCode(
                    Number(this.code)
                );


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] =
                        female
                            ? !!this[field]
                            : false;

                }
            );

        }


        // ======================================================
        // STRUCTURE NORMALIZATION
        // ======================================================

        if (
            this.recordType === "structure"
        ) {

            this.dateOfBirth = null;

            this.mass = 0;


            FEMALE_BOOLEAN_FIELDS.forEach(
                field => {

                    this[field] = false;

                }
            );

        }


        // ======================================================
        // STORAGE FACILITY FINAL VALIDATION
        // ======================================================

        if (
            this.isStorageFacility
        ) {

            if (
                this.type === "room" &&
                !isValidRoomNumber(
                    this.roomNumber
                )
            ) {

                const error =
                    new Error(
                        "Room creation requires an autogenerated positive roomNumber."
                    );

                error.status = 400;

                return next(error);

            }


            if (
                this.type === "agroStore" &&
                !isValidAgroStoreNumber(
                    this.roomNumber
                )
            ) {

                const error =
                    new Error(
                        "AgroStore creation requires an autogenerated negative roomNumber."
                    );

                error.status = 400;

                return next(error);

            }


            if (
                this.dwellNumber !== null &&
                this.dwellNumber !== undefined
            ) {

                const error =
                    new Error(
                        "Storage facilities cannot have a dwellNumber."
                    );

                error.status = 400;

                return next(error);

            }

        }


        // ======================================================
        // NON-STORAGE STRUCTURE
        // ======================================================

        if (
            this.recordType === "structure" &&
            !STORAGE_TYPES.includes(
                this.type
            )
        ) {

            this.roomNumber = null;

        }


        // ======================================================
        // NON-FEED SAFETY
        // ======================================================

        if (
            !this.isFeed
        ) {

            this.quantity = null;

            this.unit = null;

            this.stockUpdateNote = "";

            this.stockUpdates = [];

        }


        // ======================================================
        // FEED FINAL VALIDATION
        // ======================================================

        if (
            this.isFeed
        ) {

            const quantity =
                Number(
                    this.quantity
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity < 0
            ) {

                const error =
                    new Error(
                        "Feed quantity must be a valid non-negative number."
                    );

                error.status = 400;

                return next(error);

            }


            this.quantity =
                quantity;


            if (
                this.unit !== null &&
                this.unit !== undefined
            ) {

                this.unit =
                    String(
                        this.unit
                    ).trim();


                if (!this.unit) {

                    this.unit = null;

                }

            }


            this.stockUpdateNote =
                String(
                    this.stockUpdateNote || ""
                ).trim();

        }


        // ======================================================
        // FINAL DWELL VALIDATION
        // ======================================================

        if (
            this.dwellNumber !== null &&
            this.dwellNumber !== undefined &&
            !Number.isInteger(
                this.dwellNumber
            )
        ) {

            const error =
                new Error(
                    "dwellNumber must be a whole number or null."
                );

            error.status = 400;

            return next(error);

        }


        next();

    }
);


// ==========================================================
// INDEXES
// ==========================================================

dairySchema.index({

    recordType: 1,
    status: 1

});


dairySchema.index({

    isMilking: 1

});


dairySchema.index({

    isBred: 1

});


dairySchema.index({

    isInCalf: 1

});


dairySchema.index({

    isComingIntoHeat: 1

});


dairySchema.index({

    isInHeat: 1

});


dairySchema.index({

    isCloseToCalving: 1

});


dairySchema.index({

    hasCalved: 1

});


dairySchema.index({

    isLactating: 1

});


dairySchema.index({

    isDry: 1

});


dairySchema.index({

    needsMaintenance: 1

});


dairySchema.index({

    "medicalAttention.isMarked": 1

});


dairySchema.index({

    assetCode: 1,
    status: 1

});


dairySchema.index({

    dwellNumber: 1,
    status: 1

});


dairySchema.index({

    assetCode: 1,
    dwellNumber: 1,
    status: 1

});


dairySchema.index({

    recordType: 1,
    type: 1,
    status: 1

});


dairySchema.index({

    refNo: 1,
    status: 1

});


// ==========================================================
// STORAGE FACILITY INDEX
// ==========================================================

dairySchema.index(

    {
        assetCode: 1,
        type: 1,
        roomNumber: 1
    },

    {
        unique: true,

        partialFilterExpression: {

            recordType: "structure",

            type: {
                $in: [
                    "room",
                    "agroStore"
                ]
            },

            roomNumber: {
                $type: "number"
            }

        }

    }

);


// ==========================================================
// FEED STOCK INDEX
// ==========================================================

dairySchema.index({

    assetCode: 1,
    type: 1,
    dwellNumber: 1,
    quantity: 1,
    status: 1

});


// ==========================================================
// STOCK UPDATE INDEXES
// ==========================================================

dairySchema.index({

    "stockUpdates.recordedBy": 1

});


dairySchema.index({

    "stockUpdates.recordedAt": -1

});


// ==========================================================
// CODE UNIQUENESS
// ==========================================================

dairySchema.index(

    {
        code: 1
    },

    {
        unique: true,

        partialFilterExpression: {

            code: {
                $type: "number"
            }

        }

    }

);


// ==========================================================
// STATIC: GET FARM ASSETS
// ==========================================================

dairySchema.statics.getFarmAssets =
    function (farmCode) {

        const code =
            Number(farmCode);


        if (
            !isValidFarmCode(code)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: code,

            recordType: {
                $in: [
                    "animal",
                    "structure"
                ]
            }

        });

    };


// ==========================================================
// STATIC: GET ASSIGNABLE ASSETS
// ==========================================================
//
// Returns standalone assets that an admin may assign to a User.
//
// Eligibility:
//
//     recordType = structure
//     code       = null
//     assetCode  = null
//
// Assignment itself is stored in:
//
//     User.assignedAsset[]
//
// This query DOES NOT modify the Dairy document.
//
// ==========================================================

dairySchema.statics.getAssignableAssets =
    function () {

        return this.find({

            recordType: "structure",

            code: null,

            assetCode: null,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET UNASSIGNED / STANDALONE ASSETS
// ==========================================================
//
// Compatibility alias.
//
// ==========================================================

dairySchema.statics.getStandaloneAssets =
    function () {

        return this.find({

            recordType: "structure",

            code: null,

            assetCode: null,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET FARM DWELLINGS
// ==========================================================

dairySchema.statics.getFarmDwellings =
    function (farmCode) {

        const code =
            Number(farmCode);


        if (
            !isValidFarmCode(code)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: code,

            dwellNumber: {
                $ne: null
            },

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET FARM ROOM CONTENT
// ==========================================================

dairySchema.statics.getFarmRoomContent =
    function (
        farmCode,
        roomNumber
    ) {

        const farm =
            Number(farmCode);

        const room =
            Number(roomNumber);


        if (
            !isValidFarmCode(farm) ||
            !Number.isInteger(room) ||
            room < 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: room,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET FARM NORMAL ROOM CONTENT
// ==========================================================

dairySchema.statics.getFarmNormalRoomContent =
    function (
        farmCode,
        roomNumber
    ) {

        const farm =
            Number(farmCode);

        const room =
            Number(roomNumber);


        if (
            !isValidFarmCode(farm) ||
            !Number.isInteger(room) ||
            room < 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: room,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET AGROSTORE CONTENT
// ==========================================================

dairySchema.statics.getAgroStoreContent =
    function (
        farmCode,
        agroStoreNumber
    ) {

        const farm =
            Number(farmCode);

        const store =
            Number(agroStoreNumber);


        if (
            !isValidFarmCode(farm) ||
            !Number.isInteger(store) ||
            store >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: store,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET ACTIVE ROOM NUMBERS
// ==========================================================

dairySchema.statics.getActiveRoomNumbers =
    async function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return [];

        }


        const result =
            await this.aggregate([

                {
                    $match: {

                        assetCode: farm,

                        recordType: "structure",

                        type: "room",

                        roomNumber: {
                            $gt: 0
                        },

                        status: "active"

                    }

                },

                {
                    $group: {

                        _id:
                            "$roomNumber"

                    }

                },

                {
                    $sort: {

                        _id: 1

                    }

                }

            ]);


        return result.map(
            item => item._id
        );

    };


// ==========================================================
// STATIC: GET ACTIVE AGROSTORE NUMBERS
// ==========================================================

dairySchema.statics.getActiveAgroStoreNumbers =
    async function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return [];

        }


        const result =
            await this.aggregate([

                {
                    $match: {

                        assetCode: farm,

                        recordType: "structure",

                        type: "agroStore",

                        roomNumber: {
                            $lt: 0
                        },

                        status: "active"

                    }

                },

                {
                    $group: {

                        _id:
                            "$roomNumber"

                    }

                },

                {
                    $sort: {

                        _id: -1

                    }

                }

            ]);


        return result.map(
            item => item._id
        );

    };


// ==========================================================
// STATIC: GET FARM AGROSTORE CONTENTS
// ==========================================================

dairySchema.statics.getFarmAgroStoreContents =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: {
                $lt: 0
            },

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET FARM FEEDS
// ==========================================================

dairySchema.statics.getFarmFeeds =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            recordType: "structure",

            type: FEED_TYPE

        });

    };


// ==========================================================
// STATIC: GET AVAILABLE FARM FEEDS
// ==========================================================

dairySchema.statics.getAvailableFarmFeeds =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            recordType: "structure",

            type: FEED_TYPE,

            $or: [

                {
                    dwellNumber: null
                },

                {
                    dwellNumber: {
                        $exists: false
                    }
                }

            ],

            quantity: {
                $gt: 0
            },

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET AGROSTORE FEEDS
// ==========================================================

dairySchema.statics.getAgroStoreFeeds =
    function (
        farmCode,
        agroStoreNumber
    ) {

        const farm =
            Number(farmCode);

        const store =
            Number(agroStoreNumber);


        if (
            !isValidFarmCode(farm) ||
            !Number.isInteger(store) ||
            store >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            recordType: "structure",

            type: FEED_TYPE,

            dwellNumber: store,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET CODE-LESS RECORDS
// ==========================================================

dairySchema.statics.getCodeLessRecords =
    function () {

        return this.find({

            code: null

        });

    };


// ==========================================================
// STATIC: GET CODE-LESS RECORDS WITH REF NO
// ==========================================================

dairySchema.statics.getRecordsWithRefNo =
    function () {

        return this.find({

            code: null,

            refNo: {
                $ne: null
            }

        });

    };


// ==========================================================
// STATIC: GET STORAGE FACILITIES
// ==========================================================

dairySchema.statics.getStorageFacilities =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            recordType: "structure",

            assetCode: farm,

            type: {
                $in: STORAGE_TYPES
            },

            roomNumber: {
                $ne: null
            },

            dwellNumber: null,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET ROOMS
// ==========================================================

dairySchema.statics.getRooms =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            recordType: "structure",

            assetCode: farm,

            type: "room",

            roomNumber: {
                $gt: 0
            },

            dwellNumber: null,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET AGROSTORES
// ==========================================================

dairySchema.statics.getAgroStores =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !isValidFarmCode(farm)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            recordType: "structure",

            assetCode: farm,

            type: "agroStore",

            roomNumber: {
                $lt: 0
            },

            dwellNumber: null,

            status: "active"

        });

    };


// ==========================================================
// STATIC: GET DAIRY BREEDS
// ==========================================================

dairySchema.statics.getDairyBreeds =
    function () {

        return [
            ...DAIRY_BREEDS
        ];

    };


// ==========================================================
// STATIC: GET DAIRY FARM TYPES
// ==========================================================

dairySchema.statics.getDairyFarmTypes =
    function () {

        return [
            ...DAIRY_FARM_TYPES
        ];

    };


// ==========================================================
// STATIC: GET STRUCTURE TYPES
// ==========================================================

dairySchema.statics.getStructureTypes =
    function () {

        return [
            ...STRUCTURE_TYPES
        ];

    };


// ==========================================================
// STATIC: GET STORAGE TYPES
// ==========================================================

dairySchema.statics.getStorageTypes =
    function () {

        return [
            ...STORAGE_TYPES
        ];

    };


// ==========================================================
// STATIC: GET RECORD TYPES
// ==========================================================

dairySchema.statics.getRecordTypes =
    function () {

        return [
            ...RECORD_TYPES
        ];

    };


// ==========================================================
// STATIC: GET STATUSES
// ==========================================================

dairySchema.statics.getDairyStatuses =
    function () {

        return [
            ...DAIRY_STATUSES
        ];

    };


// ==========================================================
// STATIC: GET MAX PROFILE IMAGES
// ==========================================================

dairySchema.statics.getMaxProfileImages =
    function () {

        return MAX_PROFILE_IMAGES;

    };


// ==========================================================
// STATIC: GET FEED TYPE
// ==========================================================

dairySchema.statics.getFeedType =
    function () {

        return FEED_TYPE;

    };


// ==========================================================
// STATIC: CALCULATE NET WORTH
// ==========================================================

dairySchema.statics.calculateNetWorth =
    async function () {

        const result =
            await this.aggregate([

                {
                    $match: {

                        status: "active"

                    }

                },

                {
                    $group: {

                        _id: null,

                        totalNetWorth: {

                            $sum:
                                "$currentWorth"

                        }

                    }

                }

            ]);


        if (
            !result.length
        ) {

            return 0;

        }


        return Number(
            result[0].totalNetWorth || 0
        );

    };


// ==========================================================
// STATIC: TOTAL CURRENT WORTH
// ==========================================================

dairySchema.statics.getTotalCurrentWorth =
    async function () {

        return this.calculateNetWorth();

    };


// ==========================================================
// MODEL
// ==========================================================

const Dairy =
    mongoose.models.Dairy ||
    mongoose.model(
        "Dairy",
        dairySchema
    );


// ==========================================================
// CONSTANT EXPORTS
// ==========================================================

Dairy.RECORD_TYPES =
    RECORD_TYPES;

Dairy.DAIRY_BREEDS =
    DAIRY_BREEDS;

Dairy.DAIRY_FARM_TYPES =
    DAIRY_FARM_TYPES;

Dairy.STRUCTURE_TYPES =
    STRUCTURE_TYPES;

Dairy.STORAGE_TYPES =
    STORAGE_TYPES;

Dairy.DAIRY_STATUSES =
    DAIRY_STATUSES;

Dairy.FEED_TYPE =
    FEED_TYPE;

Dairy.MAX_PROFILE_IMAGES =
    MAX_PROFILE_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Dairy;