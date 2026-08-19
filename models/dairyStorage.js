// ==========================================================
// models/dairyStorage.js
// DAIRY STORAGE / ROOMS / AGROSTORE MODEL
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// This model represents the storage structure belonging to
// a Dairy Farm.
//
// It does NOT replace the Dairy model.
//
// Dairy:
//
//     animals
//     assets
//     structures
//
// DairyStorage:
//
//     rooms
//     AgroStores
//
// ==========================================================
//
// FARM OWNERSHIP
// ----------------------------------------------------------
//
// farmCode
//     = negative code of the parent Dairy Farm.
//
// Example:
//
//     farmCode = -1
//
// means:
//
//     this storage facility belongs to
//     Dairy Farm code -1.
//
// ==========================================================
//
// ROOM NUMBER
// ----------------------------------------------------------
//
// roomNumber >= 0
//     = normal room.
//
// roomNumber < 0
//     = special storage.
//
// Examples:
//
//     roomNumber = 0
//     roomNumber = 1
//     roomNumber = 2
//
//     roomNumber = -1
//     roomNumber = -2
//
// ==========================================================
//
// NORMAL ROOM
// ----------------------------------------------------------
//
// A normal room is associated with a Dairy dwellNumber.
//
// Example:
//
//     Dairy:
//
//         assetCode   = -1
//         dwellNumber = 2
//
// means:
//
//     the entity belongs to farm -1
//     and is accommodated in Room 2.
//
// A room should only be considered active when at least
// one Dairy entity actually has:
//
//     assetCode   = farmCode
//     dwellNumber = roomNumber
//
// ==========================================================
//
// ROOM NAME
// ----------------------------------------------------------
//
// The frontend controls the room name.
//
// Example:
//
//     roomNumber = 1
//     name       = "Calf House"
//
// If no name is configured:
//
//     Room 1
//
// ==========================================================
//
// AGROSTORE
// ----------------------------------------------------------
//
// AgroStore is special storage.
//
// AgroStores use negative roomNumber values:
//
//     -1
//     -2
//     -3
//     ...
//
// Multiple AgroStores may belong to the same farm.
//
// Examples:
//
//     AgroStore -1
//     AgroStore -2
//     AgroStore -3
//
// AgroStore is intended for things such as:
//
//     animal feeds
//     veterinary medicines
//     agricultural supplies
//     consumable farm supplies
//
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// AgroStore is NOT represented by a Dairy document.
//
// It belongs to DairyStorage.
//
// Ordinary Dairy entities must NEVER use a negative
// dwellNumber when they have assetCode.
//
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================


// ==========================================================
// STORAGE TYPES
// ==========================================================

const STORAGE_TYPES = [

    "room",

    "agroStore"

];


// ==========================================================
// STORAGE STATUS
// ==========================================================

const STORAGE_STATUSES = [

    "active",

    "inactive"

];


// ==========================================================
// MAIN SCHEMA
// ==========================================================

const dairyStorageSchema =

    new mongoose.Schema(

        {

            // ==================================================
            // PARENT FARM
            // ==================================================
            //
            // Always the negative code of a Dairy Farm.
            //
            // ==================================================

            farmCode: {

                type: Number,

                required: true,

                validate: {

                    validator: function (
                        value
                    ) {

                        return (

                            Number.isInteger(
                                value
                            ) &&

                            value < 0

                        );

                    },

                    message:
                        "farmCode must be the negative code of a Dairy Farm."

                },

                index: true

            },


            // ==================================================
            // ROOM NUMBER
            // ==================================================
            //
            // Normal room:
            //
            //     0+
            //
            // AgroStore:
            //
            //     negative
            //
            // ==================================================

            roomNumber: {

                type: Number,

                required: true,

                validate: {

                    validator: function (
                        value
                    ) {

                        return Number.isInteger(
                            value
                        );

                    },

                    message:
                        "roomNumber must be a whole number."

                }

            },


            // ==================================================
            // ROOM NAME
            // ==================================================
            //
            // Set by frontend.
            //
            // Empty means default display name:
            //
            //     Room <roomNumber>
            //
            // or for AgroStore:
            //
            //     AgroStore <absolute number>
            //
            // ==================================================

            name: {

                type: String,

                trim: true,

                default: "",

                maxlength: 200

            },


            // ==================================================
            // STORAGE TYPE
            // ==================================================

            type: {

                type: String,

                enum: STORAGE_TYPES,

                required: true,

                default: "room"

            },


            // ==================================================
            // STATUS
            // ==================================================

            status: {

                type: String,

                enum: STORAGE_STATUSES,

                default: "active",

                index: true

            },


            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {

                type: String,

                trim: true,

                default: "",

                maxlength: 5000

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
// VIRTUAL: IS NORMAL ROOM
// ==========================================================

dairyStorageSchema.virtual(
    "isRoom"
).get(function () {

    return (

        Number.isInteger(
            this.roomNumber
        ) &&

        this.roomNumber >= 0

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE
// ==========================================================

dairyStorageSchema.virtual(
    "isAgroStore"
).get(function () {

    return (

        Number.isInteger(
            this.roomNumber
        ) &&

        this.roomNumber < 0

    );

});


// ==========================================================
// VIRTUAL: DISPLAY NAME
// ==========================================================

dairyStorageSchema.virtual(
    "displayName"
).get(function () {

    if (
        this.name &&
        String(this.name).trim()
    ) {

        return String(
            this.name
        ).trim();

    }


    if (this.isAgroStore) {

        return (

            `AgroStore ` +

            `${Math.abs(
                this.roomNumber
            )}`

        );

    }


    return (

        `Room ${this.roomNumber}`

    );

});


// ==========================================================
// VIRTUAL: IS ACTIVE
// ==========================================================

dairyStorageSchema.virtual(
    "isActiveStorage"
).get(function () {

    return this.status === "active";

});


// ==========================================================
// PRE VALIDATE
// ==========================================================

dairyStorageSchema.pre(
    "validate",
    function (next) {

        // ==================================================
        // FARM CODE
        // ==================================================

        if (

            this.farmCode === null ||

            this.farmCode === undefined

        ) {

            const error =

                new Error(

                    "farmCode is required."

                );


            error.status = 400;


            return next(error);

        }


        if (

            !Number.isInteger(
                this.farmCode
            ) ||

            this.farmCode >= 0

        ) {

            const error =

                new Error(

                    "farmCode must be the negative code of a Dairy Farm."

                );


            error.status = 400;


            return next(error);

        }


        // ==================================================
        // ROOM NUMBER
        // ==================================================

        if (

            this.roomNumber === null ||

            this.roomNumber === undefined

        ) {

            const error =

                new Error(

                    "roomNumber is required."

                );


            error.status = 400;


            return next(error);

        }


        if (
            !Number.isInteger(
                this.roomNumber
            )
        ) {

            const error =

                new Error(

                    "roomNumber must be a whole number."

                );


            error.status = 400;


            return next(error);

        }


        // ==================================================
        // TYPE NORMALIZATION
        // ==================================================
        //
        // Negative room numbers are ALWAYS AgroStores.
        //
        // Non-negative room numbers are ALWAYS normal rooms.
        //
        // ==================================================

        if (
            this.roomNumber < 0
        ) {

            this.type =
                "agroStore";

        } else {

            this.type =
                "room";

        }


        // ==================================================
        // AGROSTORE
        // ==================================================

        if (
            this.isAgroStore
        ) {

            // ----------------------------------------------
            // AgroStore is special storage.
            // ----------------------------------------------

            if (
                !this.name
            ) {

                this.name =
                    `AgroStore ${Math.abs(
                        this.roomNumber
                    )}`;

            }

        }


        // ==================================================
        // NORMAL ROOM
        // ==================================================

        if (
            this.isRoom
        ) {

            if (
                !this.name
            ) {

                this.name =
                    `Room ${this.roomNumber}`;

            }

        }


        next();

    }

);


// ==========================================================
// INDEX
// ==========================================================
//
// A farm cannot have two storage definitions using the
// same roomNumber.
//
// Therefore:
//
//     Farm -1 + Room 1
//
// is unique.
//
// But:
//
//     Farm -1 + Room 1
//     Farm -2 + Room 1
//
// are both valid.
//
// ==========================================================

dairyStorageSchema.index(

    {

        farmCode: 1,

        roomNumber: 1

    },

    {

        unique: true

    }

);


// ==========================================================
// INDEX: FARM + TYPE
// ==========================================================

dairyStorageSchema.index({

    farmCode: 1,

    type: 1,

    status: 1

});


// ==========================================================
// STATIC: GET FARM ROOMS
// ==========================================================

dairyStorageSchema.statics.getFarmRooms =

    function (
        farmCode
    ) {

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

            farmCode: code,

            roomNumber: {

                $gte: 0

            },

            status: "active"

        })
        .sort({

            roomNumber: 1

        });

    };


// ==========================================================
// STATIC: GET FARM AGROSTORES
// ==========================================================

dairyStorageSchema.statics.getFarmAgroStores =

    function (
        farmCode
    ) {

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

            farmCode: code,

            roomNumber: {

                $lt: 0

            },

            status: "active"

        })
        .sort({

            roomNumber: 1

        });

    };


// ==========================================================
// STATIC: GET ROOM
// ==========================================================

dairyStorageSchema.statics.getRoom =

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


        return this.findOne({

            farmCode: farm,

            roomNumber: room,

            type: "room"

        });

    };


// ==========================================================
// STATIC: GET AGROSTORE
// ==========================================================

dairyStorageSchema.statics.getAgroStore =

    function (
        farmCode,
        roomNumber
    ) {

        const farm =
            Number(farmCode);

        const store =
            Number(roomNumber);


        if (

            !Number.isInteger(farm) ||

            farm >= 0 ||

            !Number.isInteger(store) ||

            store >= 0

        ) {

            return null;

        }


        return this.findOne({

            farmCode: farm,

            roomNumber: store,

            type: "agroStore"

        });

    };


// ==========================================================
// STATIC: GET ALL FARM STORAGE
// ==========================================================

dairyStorageSchema.statics.getFarmStorage =

    function (
        farmCode
    ) {

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

            farmCode: code,

            status: "active"

        })
        .sort({

            roomNumber: 1

        });

    };


// ==========================================================
// STATIC: GET ROOM NAME
// ==========================================================

dairyStorageSchema.statics.getRoomDisplayName =

    async function (
        farmCode,
        roomNumber
    ) {

        const room =

            await this.findOne({

                farmCode:
                    Number(farmCode),

                roomNumber:
                    Number(roomNumber),

                status:
                    "active"

            });


        if (room) {

            return room.displayName;

        }


        const number =
            Number(roomNumber);


        if (
            number < 0
        ) {

            return (

                `AgroStore ${Math.abs(
                    number
                )}`

            );

        }


        return (

            `Room ${number}`

        );

    };


// ==========================================================
// STATIC: GET STORAGE TYPES
// ==========================================================

dairyStorageSchema.statics.getStorageTypes =

    function () {

        return [

            ...STORAGE_TYPES

        ];

    };


// ==========================================================
// STATIC: GET STORAGE STATUSES
// ==========================================================

dairyStorageSchema.statics.getStorageStatuses =

    function () {

        return [

            ...STORAGE_STATUSES

        ];

    };


// ==========================================================
// MODEL
// ==========================================================

const DairyStorage =

    mongoose.models.DairyStorage ||

    mongoose.model(

        "DairyStorage",

        dairyStorageSchema

    );


// ==========================================================
// CONSTANT EXPORTS
// ==========================================================

DairyStorage.STORAGE_TYPES =
    STORAGE_TYPES;


DairyStorage.STORAGE_STATUSES =
    STORAGE_STATUSES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports = DairyStorage;