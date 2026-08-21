// ==========================================================
// models/dairy.js
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
// ==========================================================
//
// SINGLE SOURCE OF TRUTH
//
// recordType
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
// ----------------------------------------------------------
//
// type
// ----------------------------------------------------------
//
//     farm
//         = ranch / zeroGrazing / etc.
//
//     animal
//         = Friesian / Ayrshire / Jersey / etc.
//
//     structure
//         = room / agroStore / building / machine / feeds / etc.
//
// STORAGE EXAMPLE:
//
//     recordType: "structure"
//     type: "room"
//
//     OR
//
//     recordType: "structure"
//     type: "agroStore"
//
// FEED STOCK EXAMPLE:
//
//     recordType: "structure"
//     type: "feeds"
//
// ==========================================================
//
// ENTITY CODE
// ----------------------------------------------------------
//
// code < 0
//     = Dairy Farm
//
// code > 0
//     = Identified Animal
//
// code === null
//     = Structure / Facility / Manual Asset
//
// ==========================================================
//
// ASSET OWNERSHIP
// ----------------------------------------------------------
//
// assetCode
//     = negative code of parent Dairy Farm
//
// Dairy Farm:
//     assetCode = null
//
// Animal:
//     assetCode = negative Dairy Farm code
//
// Assigned Structure / Asset:
//     assetCode = negative Dairy Farm code
//
// Standalone Structure / Asset:
//     assetCode = null
//
// IMPORTANT:
//
// The parent farm is identified by MongoDB _id when passed
// through routes such as:
//
//     /storage/:id/add
//
// The relationship stored on the created record is:
//
//     assetCode = parentDairy.code
//
// ==========================================================
//
// DWELLING / ALLOCATION
// ----------------------------------------------------------
//
// dwellNumber >= 0
//     = Normal Room
//
// dwellNumber < 0
//     = AgroStore
//
// dwellNumber === null
//     = Not Allocated
//
// ==========================================================
//
// FEED STOCK
// ----------------------------------------------------------
//
// type === "feeds"
//     = Feed Stock Item
//
// recordType remains independent:
//
//     recordType === "structure"
//     type === "feeds"
//
// Only feed records may contain:
//
//     quantity
//     unit
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
//
// IMPORTANT:
//
// This is the record classification.
//
// It is NOT the same thing as `type`.
//
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
// STRUCTURE / FACILITY / ASSET TYPES
// ==========================================================
//
// IMPORTANT:
//
// Storage types are also represented through `type`.
//
// Therefore:
//
//     recordType = "structure"
//     type = "room"
//
//     recordType = "structure"
//     type = "agroStore"
//
// `recordType` identifies the record as a structure.
//
// `type` identifies the specific structure/facility type.
//
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

    // Feed stock item.
    //
    // This is deliberately a `type`, not a `recordType`.
    "feeds",

    "other"

];


// ==========================================================
// FEED TYPE
// ==========================================================
//
// IMPORTANT:
//
// `feeds` belongs to the `type` field.
//
// It does NOT become a recordType.
//
// ==========================================================

const FEED_TYPE = "feeds";


// ==========================================================
// STORAGE TYPES
// ==========================================================

const STORAGE_TYPES = [

    "room",
    "agroStore"

];


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
// HELPER: NORMALIZE PROFILE IMAGE
// ==========================================================

function normalizeProfileImage(
    image,
    name
) {

    if (!image) {

        return (
            "https://ui-avatars.com/api/?name=" +
            `${encodeURIComponent(
                name || "Dairy"
            )}`
        );

    }


    const value =
        String(image).trim();


    if (!value) {

        return (
            "https://ui-avatars.com/api/?name=" +
            `${encodeURIComponent(
                name || "Dairy"
            )}`
        );

    }


    return value;

}


// ==========================================================
// MAIN DAIRY SCHEMA
// ==========================================================

const dairySchema =
    new mongoose.Schema(

        {

            // ==================================================
            // RECORD TYPE
            // ==================================================
            //
            // IMPORTANT:
            //
            // recordType is NOT `type`.
            //
            // recordType:
            //
            //     farm
            //     animal
            //     structure
            //
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
            // CODE
            // ==================================================
            //
            // NEGATIVE = FARM
            // POSITIVE = ANIMAL
            // NULL     = STRUCTURE
            //
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
            // MILKING STATUS
            // ==================================================

            isMilking: {

                type: Boolean,

                default: false

            },


            // ==================================================
            // ASSET CODE
            // ==================================================
            //
            // Parent Dairy Farm code.
            //
            // MUST be negative when supplied.
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
            // DWELL NUMBER
            // ==================================================
            //
            // >= 0
            //     normal room
            //
            // < 0
            //     AgroStore
            //
            // null
            //     not allocated
            //
            // ==================================================

            dwellNumber: {

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
                        "dwellNumber must be a whole number or null."

                }

            },


            // ==================================================
            // FEED QUANTITY
            // ==================================================
            //
            // ONLY VALID WHEN:
            //
            //     type === "feeds"
            //
            // ==================================================

            quantity: {

                type: Number,

                min: 0,

                default: null

            },


            // ==================================================
            // FEED UNIT
            // ==================================================
            //
            // ONLY VALID WHEN:
            //
            //     type === "feeds"
            //
            // ==================================================

            unit: {

                type: String,

                trim: true,

                default: null,

                maxlength: 50

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
            // TYPE
            // ==================================================
            //
            // IMPORTANT:
            //
            // This is NOT recordType.
            //
            // Examples:
            //
            //     recordType: "structure"
            //     type: "room"
            //
            //     recordType: "structure"
            //     type: "agroStore"
            //
            //     recordType: "structure"
            //     type: "feeds"
            //
            //     recordType: "animal"
            //     type: "Friesian"
            //
            //     recordType: "farm"
            //     type: "ranch"
            //
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
// VIRTUAL: IS MANUAL ASSET
// ==========================================================
//
// A structure with no parent farm.
//
// ==========================================================

dairySchema.virtual(
    "isManualAsset"
).get(function () {

    return (

        this.isStructure &&
        (
            this.assetCode === null ||
            this.assetCode === undefined
        )

    );

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
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

dairySchema.virtual(
    "isStandaloneAsset"
).get(function () {

    return this.isManualAsset;

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

        this.isDwelling &&
        Number(this.dwellNumber) >= 0

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE
// ==========================================================
//
// IMPORTANT:
//
// This checks the STRUCTURE TYPE.
//
// A storage facility itself is:
//
//     recordType = "structure"
//     type = "agroStore"
//
// ==========================================================

dairySchema.virtual(
    "isAgroStore"
).get(function () {

    return (

        this.isStructure &&
        String(this.type || "")
            .trim()
            .toLowerCase() ===
            "agrostore"

    );

});


// ==========================================================
// VIRTUAL: IS ROOM
// ==========================================================

dairySchema.virtual(
    "isRoom"
).get(function () {

    return (

        this.isStructure &&
        String(this.type || "")
            .trim()
            .toLowerCase() ===
            "room"

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE CONTENT
// ==========================================================
//
// A record allocated to an AgroStore is identified by a
// negative dwellNumber.
//
// ==========================================================

dairySchema.virtual(
    "isAgroStoreContent"
).get(function () {

    return (

        this.dwellNumber !== null &&
        this.dwellNumber !== undefined &&
        Number(this.dwellNumber) < 0

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
//
// IMPORTANT:
//
// Feed is determined by `type`.
//
// NOT by recordType.
//
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
        Number(this.code) % 2 === 0

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
            this.dwellNumber === undefined
        ) {

            this.dwellNumber = null;

        }


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
        // DETERMINE RECORD TYPE
        // ======================================================
        //
        // New records should provide recordType.
        //
        // For compatibility with existing records, if
        // recordType is missing it is derived from code.
        //
        // IMPORTANT:
        //
        // This is only deriving the record classification.
        //
        // It does NOT turn `type` into `recordType`.
        //
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

                    this.recordType = "farm";

                } else if (
                    Number(this.code) > 0
                ) {

                    this.recordType = "animal";

                }

            } else {

                this.recordType = "structure";

            }

        }


        // ======================================================
        // RECORD TYPE / CODE CONSISTENCY
        // ======================================================

        if (
            this.recordType === "farm"
        ) {

            if (
                this.code === null ||
                this.code === undefined ||
                !Number.isInteger(
                    this.code
                ) ||
                Number(this.code) >= 0
            ) {

                const error =
                    new Error(
                        "A farm record must have a negative integer code."
                    );

                error.status = 400;

                return next(error);

            }

        }


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

        }


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

        }


        // ======================================================
        // FEED STOCK NORMALIZATION
        // ======================================================
        //
        // Feed is identified by:
        //
        //     type === "feeds"
        //
        // NOT by recordType.
        //
        // ======================================================

        const isFeed =
            String(
                this.type || ""
            )
                .trim()
                .toLowerCase() ===
            FEED_TYPE;


        if (isFeed) {

            // --------------------------------------------------
            // Feed must be a structure record.
            // --------------------------------------------------

            if (
                this.recordType !== "structure"
            ) {

                const error =
                    new Error(
                        "Feed records must have recordType set to \"structure\"."
                    );

                error.status = 400;

                return next(error);

            }


            // --------------------------------------------------
            // QUANTITY
            // --------------------------------------------------

            if (
                this.quantity === null ||
                this.quantity === undefined ||
                this.quantity === ""
            ) {

                this.quantity = 0;

            } else {

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

            }


            // --------------------------------------------------
            // UNIT
            // --------------------------------------------------

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

        } else {

            // --------------------------------------------------
            // NON-FEEDS MUST NEVER RETAIN FEED DATA
            // --------------------------------------------------

            this.quantity = null;

            this.unit = null;

        }


        // ======================================================
        // DAIRY FARM
        // ======================================================

        if (
            this.recordType === "farm"
        ) {

            // --------------------------------------------------
            // Farm is a root entity.
            // --------------------------------------------------

            this.assetCode = null;

            this.dwellNumber = null;


            // --------------------------------------------------
            // Farm cannot have animal-specific fields.
            // --------------------------------------------------

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // --------------------------------------------------
            // Farm cannot be feed stock.
            // --------------------------------------------------

            this.quantity = null;

            this.unit = null;


            // --------------------------------------------------
            // Validate farm type.
            //
            // IMPORTANT:
            //
            // This is `type`, not `recordType`.
            // --------------------------------------------------

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

        }


        // ======================================================
        // ANIMAL
        // ======================================================

        if (
            this.recordType === "animal"
        ) {

            // --------------------------------------------------
            // Male animals cannot be marked as milking.
            // --------------------------------------------------

            if (
                !this.isFemale
            ) {

                this.isMilking = false;

            }


            // --------------------------------------------------
            // Every animal must belong to a farm.
            // --------------------------------------------------

            if (
                this.assetCode === null ||
                this.assetCode === undefined
            ) {

                const error =
                    new Error(
                        "Animal must belong to a Dairy Farm. assetCode is required."
                    );

                error.status = 400;

                return next(error);

            }


            // --------------------------------------------------
            // Parent farm code must be negative.
            // --------------------------------------------------

            if (
                Number(
                    this.assetCode
                ) >= 0
            ) {

                const error =
                    new Error(
                        "Animal assetCode must be the negative code of its parent Dairy Farm."
                    );

                error.status = 400;

                return next(error);

            }


            // --------------------------------------------------
            // Animals cannot have feed data.
            // --------------------------------------------------

            this.quantity = null;

            this.unit = null;


            // --------------------------------------------------
            // Validate breed.
            //
            // IMPORTANT:
            //
            // Breed is `type`.
            // --------------------------------------------------

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

        }


        // ======================================================
        // STRUCTURE / FACILITY / ASSET
        // ======================================================

        if (
            this.recordType === "structure"
        ) {

            // --------------------------------------------------
            // Structures cannot have animal-specific fields.
            // --------------------------------------------------

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // --------------------------------------------------
            // Assigned structure / asset
            // --------------------------------------------------

            if (
                this.assetCode !== null &&
                this.assetCode !== undefined
            ) {

                if (
                    Number(
                        this.assetCode
                    ) >= 0
                ) {

                    const error =
                        new Error(
                            "Structure assetCode must be the negative code of its parent Dairy Farm."
                        );

                    error.status = 400;

                    return next(error);

                }

            }


            // --------------------------------------------------
            // Validate structure type.
            //
            // IMPORTANT:
            //
            // Storage uses:
            //
            //     type = room
            //     type = agroStore
            //
            // --------------------------------------------------

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

        }


        // ======================================================
        // DWELL NUMBER
        // ======================================================

        if (
            this.dwellNumber !== null &&
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
        // DAIRY FARM NORMALIZATION
        // ======================================================

        if (
            this.recordType === "farm"
        ) {

            this.assetCode = null;

            this.dwellNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

            this.quantity = null;

            this.unit = null;

        }


        // ======================================================
        // STRUCTURE NORMALIZATION
        // ======================================================

        if (
            this.recordType === "structure"
        ) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ======================================================
        // NON-FEED QUANTITY SAFETY
        // ======================================================

        if (
            !this.isFeed
        ) {

            this.quantity = null;

            this.unit = null;

        }


        // ======================================================
        // FINAL FEED QUANTITY VALIDATION
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


// ----------------------------------------------------------
// RECORD TYPE
// ----------------------------------------------------------

dairySchema.index({

    recordType: 1,
    status: 1

});


// ----------------------------------------------------------
// MILKING
// ----------------------------------------------------------

dairySchema.index({

    isMilking: 1

});


// ----------------------------------------------------------
// MAINTENANCE
// ----------------------------------------------------------

dairySchema.index({

    needsMaintenance: 1

});


// ----------------------------------------------------------
// MEDICAL
// ----------------------------------------------------------

dairySchema.index({

    "medicalAttention.isMarked": 1

});


// ----------------------------------------------------------
// ASSET ASSIGNMENT
// ----------------------------------------------------------

dairySchema.index({

    assetCode: 1,
    status: 1

});


// ----------------------------------------------------------
// DWELLING / ALLOCATION
// ----------------------------------------------------------

dairySchema.index({

    dwellNumber: 1,
    status: 1

});


// ----------------------------------------------------------
// FARM + DWELLING
// ----------------------------------------------------------

dairySchema.index({

    assetCode: 1,
    dwellNumber: 1,
    status: 1

});


// ----------------------------------------------------------
// RECORD TYPE + TYPE
// ----------------------------------------------------------

dairySchema.index({

    recordType: 1,
    type: 1,
    status: 1

});


// ----------------------------------------------------------
// FEED STOCK
// ----------------------------------------------------------

dairySchema.index({

    assetCode: 1,
    type: 1,
    dwellNumber: 1,
    quantity: 1,
    status: 1

});


// ----------------------------------------------------------
// CODE UNIQUENESS
// ----------------------------------------------------------

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
            !Number.isInteger(code) ||
            code >= 0
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
// STATIC: GET FARM DWELLINGS
// ==========================================================

dairySchema.statics.getFarmDwellings =
    function (farmCode) {

        const code =
            Number(farmCode);


        if (
            !Number.isInteger(code) ||
            code >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: code,

            dwellNumber: {
                $ne: null
            }

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
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(room)
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: room

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
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(store) ||
            store >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: store

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
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(room) ||
            room < 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            assetCode: farm,

            dwellNumber: room

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
            !Number.isInteger(farm) ||
            farm >= 0
        ) {

            return [];

        }


        const result =
            await this.aggregate([

                {
                    $match: {

                        assetCode: farm,

                        dwellNumber: {
                            $gte: 0
                        },

                        status: "active"

                    }
                },

                {
                    $group: {

                        _id:
                            "$dwellNumber"

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
            !Number.isInteger(farm) ||
            farm >= 0
        ) {

            return [];

        }


        const result =
            await this.aggregate([

                {
                    $match: {

                        assetCode: farm,

                        dwellNumber: {
                            $lt: 0
                        },

                        status: "active"

                    }
                },

                {
                    $group: {

                        _id:
                            "$dwellNumber"

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
// STATIC: GET FARM AGROSTORE CONTENTS
// ==========================================================

dairySchema.statics.getFarmAgroStoreContents =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !Number.isInteger(farm) ||
            farm >= 0
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
//
// Feed identification remains:
//
//     type: "feeds"
//
// NOT:
//
//     recordType: "feeds"
//
// ==========================================================

dairySchema.statics.getFarmFeeds =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !Number.isInteger(farm) ||
            farm >= 0
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
//
// Available means:
//
//     correct farm
//     recordType = structure
//     type = feeds
//     unallocated
//     quantity > 0
//
// ==========================================================

dairySchema.statics.getAvailableFarmFeeds =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !Number.isInteger(farm) ||
            farm >= 0
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
            }

        });

    };


// ==========================================================
// STATIC: GET AGROSTORE FEEDS
// ==========================================================
//
// Returns only feeds currently allocated to an AgroStore.
//
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
            !Number.isInteger(farm) ||
            farm >= 0 ||
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

            dwellNumber: store

        });

    };


// ==========================================================
// STATIC: GET STANDALONE ASSETS
// ==========================================================
//
// Manual / standalone assets:
//
//     recordType = structure
//     code = null
//     assetCode = null
//
// ==========================================================

dairySchema.statics.getStandaloneAssets =
    function () {

        return this.find({

            recordType: "structure",

            code: null,

            assetCode: null

        });

    };


// ==========================================================
// STATIC: GET STORAGE FACILITIES
// ==========================================================
//
// Returns storage structures:
//
//     recordType = structure
//
//     type = room
//     OR
//     type = agroStore
//
// ==========================================================

dairySchema.statics.getStorageFacilities =
    function (farmCode) {

        const farm =
            Number(farmCode);


        if (
            !Number.isInteger(farm) ||
            farm >= 0
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
            }

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
            !Number.isInteger(farm) ||
            farm >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            recordType: "structure",

            assetCode: farm,

            type: "room",

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
            !Number.isInteger(farm) ||
            farm >= 0
        ) {

            return this.find({
                _id: null
            });

        }


        return this.find({

            recordType: "structure",

            assetCode: farm,

            type: "agroStore",

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
//
// Current worth of all active records.
//
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