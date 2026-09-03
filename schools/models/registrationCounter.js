// ==========================================================
// schools/models/registrationCounter.js
// REGISTRATION NUMBER SEQUENCE COUNTER
// ==========================================================
//
// This model DOES NOT generate registration numbers.
//
// It only stores the next sequence state for a combination
// of programme and admission year.
//
// The actual registration number is generated exclusively by:
//     services/studentAdmissionService.js
// ==========================================================

const mongoose = require("mongoose");

const registrationCounterSchema =
    new mongoose.Schema(

        {
            programme: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Programme",
                required: true,
                index: true
            },

            admissionYear: {
                type: Number,
                required: true,
                min: 1900,
                max: 9999,
                index: true
            },

            sequence: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            }
        },

        {
            timestamps: true
        }
    );


// One counter per programme per admission year.
registrationCounterSchema.index(
    {
        programme: 1,
        admissionYear: 1
    },
    {
        unique: true
    }
);


module.exports =
    mongoose.models.RegistrationCounter ||
    mongoose.model(
        "RegistrationCounter",
        registrationCounterSchema
    );
