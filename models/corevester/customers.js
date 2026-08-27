// ==========================================================
// models/corevester/customers.js
// CUSTOMER MODEL
// ==========================================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        }
    },
    {
        timestamps: true
    }
);

// ==========================================================
// HASH PASSWORD BEFORE SAVE
// ==========================================================

customerSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        return next();
    }

    try {

        const salt = await bcrypt.genSalt(12);

        this.password = await bcrypt.hash(
            this.password,
            salt
        );

        next();

    } catch (error) {
        next(error);
    }
});

// ==========================================================
// PASSWORD COMPARISON
// ==========================================================

customerSchema.methods.comparePassword = async function (
    candidatePassword
) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );
};

// ==========================================================
// HIDE PASSWORD WHEN CONVERTING TO JSON
// ==========================================================

customerSchema.methods.toJSON = function () {

    const customer = this.toObject();

    delete customer.password;

    return customer;
};

module.exports = mongoose.model(
    "Customer",
    customerSchema
);