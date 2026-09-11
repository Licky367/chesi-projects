// ==========================================================
// verrah/models/user.js
// VERRAH COSMETICS
// USER MODEL
// ==========================================================

const mongoose = require("mongoose");
const crypto = require("crypto");


// ==========================================================
// PASSWORD HASHING
// ==========================================================

const PASSWORD_KEY_LENGTH = 64;

const PASSWORD_SALT_LENGTH = 16;

const PASSWORD_HASH_PREFIX = "scrypt";


// ==========================================================
// HASH PASSWORD
// ==========================================================

function hashPassword(password) {

    const salt = crypto.randomBytes(
        PASSWORD_SALT_LENGTH
    ).toString("hex");

    const derivedKey = crypto.scryptSync(
        password,
        salt,
        PASSWORD_KEY_LENGTH
    );

    return [
        PASSWORD_HASH_PREFIX,
        salt,
        derivedKey.toString("hex")
    ].join("$");
}


// ==========================================================
// VERIFY PASSWORD
// ==========================================================

function verifyPassword(password, storedHash) {

    if (!isPasswordHash(storedHash)) {
        return false;
    }

    const parts = storedHash.split("$");

    const salt = parts[1];

    const storedKey = Buffer.from(
        parts[2],
        "hex"
    );

    const derivedKey = crypto.scryptSync(
        password,
        salt,
        PASSWORD_KEY_LENGTH
    );

    if (storedKey.length !== derivedKey.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        storedKey,
        derivedKey
    );
}


// ==========================================================
// PASSWORD HASH CHECK
// ==========================================================

function isPasswordHash(value) {

    if (typeof value !== "string") {
        return false;
    }

    const parts = value.split("$");

    return (
        parts.length === 3 &&
        parts[0] === PASSWORD_HASH_PREFIX &&
        parts[1].length > 0 &&
        parts[2].length > 0
    );
}


// ==========================================================
// USER SCHEMA
// ==========================================================

const userSchema = new mongoose.Schema(
    {

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },


        // --------------------------------------------------
        // PHONE
        // --------------------------------------------------

        phone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30
        },


        // --------------------------------------------------
        // EMAIL
        // --------------------------------------------------

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },


        // --------------------------------------------------
        // PASSWORD
        // --------------------------------------------------

        password: {
            type: String,
            required: true
        },


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        role: {
            type: String,
            enum: [
                "admin",
                "staff",
                "customer"
            ],
            default: "customer"
        },


        // --------------------------------------------------
        // ASSIGNED SUBSTATION
        // --------------------------------------------------

        assignedSubstation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Substation",
            default: null
        }

    },
    {
        timestamps: true
    }
);


// ==========================================================
// NORMALIZE EMAIL
// ==========================================================

userSchema.pre(
    "validate",
    function (next) {

        if (typeof this.email === "string") {

            this.email =
                this.email.trim().toLowerCase();

        }

        if (typeof this.name === "string") {

            this.name =
                this.name.trim();

        }

        if (typeof this.phone === "string") {

            this.phone =
                this.phone.trim();

        }

        next();
    }
);


// ==========================================================
// HASH PASSWORD BEFORE SAVE
// ==========================================================

userSchema.pre(
    "save",
    function (next) {

        if (!this.isModified("password")) {
            return next();
        }

        if (isPasswordHash(this.password)) {
            return next();
        }

        this.password =
            hashPassword(this.password);

        next();
    }
);


// ==========================================================
// COMPARE PASSWORD
// ==========================================================

userSchema.methods.comparePassword =
    function (password) {

        return verifyPassword(
            password,
            this.password
        );
    };


// ==========================================================
// SAFE JSON
// ==========================================================

userSchema.methods.toJSON =
    function () {

        const object =
            this.toObject();

        delete object.password;

        return object;
    };


// ==========================================================
// MODEL
// ==========================================================

module.exports =
    mongoose.model(
        "VerrahUser",
        userSchema
    );