const mongoose = require("mongoose");


const servicesSchema = new mongoose.Schema(
    {

        name: {
            type: String,
            required: true,
            trim: true
        },


        description: {
            type: String,
            required: true,
            trim: true
        },


        price: {
            type: Number,
            required: true,
            min: 0
        },


        duration: {
            type: String,
            trim: true,
            default: ""
        },


        image: {
            type: String,
            trim: true,
            default: ""
        },


        active: {
            type: Boolean,
            default: true
        }

    },
    {
        timestamps: true
    }
);


module.exports =
    mongoose.model(
        "Services",
        servicesSchema
    );