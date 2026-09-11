// ==========================================================
// verrah/models/invitation.js
// VERRAH COSMETICS
// INVITATION MODEL
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// INVITATION SCHEMA
// ==========================================================

const invitationSchema =
    new mongoose.Schema(
        {

            // --------------------------------------------------
            // EMAIL
            // --------------------------------------------------

            email: {

                type: String,

                required: true,

                unique: true,

                trim: true,

                lowercase: true,

                index: true

            },


            // --------------------------------------------------
            // ROLE
            // --------------------------------------------------

            role: {

                type: String,

                enum: [
                    "admin",
                    "staff",
                    "client"
                ],

                required: true

            },


            // --------------------------------------------------
            // ASSIGNED SUBSTATION
            // --------------------------------------------------
            //
            // Used when the invited user is staff.
            //
            // The invitation stores the Substation ID.
            // When the staff member registers, this ID is
            // transferred to User.assignedSubstation.
            //
            // --------------------------------------------------

            assignedSubstation: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Substation",

                default: null

            },


            // --------------------------------------------------
            // INVITED BY
            // --------------------------------------------------

            invitedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "VerrahUser",

                required: true

            },


            // --------------------------------------------------
            // USED AT
            // --------------------------------------------------

            usedAt: {

                type: Date,

                default: null

            },


            // --------------------------------------------------
            // USED BY
            // --------------------------------------------------

            usedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "VerrahUser",

                default: null

            }

        },

        {

            timestamps: true

        }
    );


// ==========================================================
// MODEL
// ==========================================================

module.exports =
    mongoose.model(
        "VerrahInvitation",
        invitationSchema
    );