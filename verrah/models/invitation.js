const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },

        role: {
            type: String,
            enum: ["admin", "staff", "client"],
            required: true
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CorevesterUser",
            required: true
        },

        usedAt: {
            type: Date,
            default: null
        },

        usedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CorevesterUser",
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("CorevesterInvitation", invitationSchema);
