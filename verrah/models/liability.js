const mongoose = require("mongoose");


const liabilitySchema = new mongoose.Schema(
    {

        name: {
            type: String,
            required: true,
            trim: true
        },


        amount: {
            type: Number,
            required: true,
            min: 0
        },


        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },


        substation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Substation",
            required: true
        }

    },

    {
        timestamps: true
    }
);


module.exports = mongoose.model(
    "Liability",
    liabilitySchema
);