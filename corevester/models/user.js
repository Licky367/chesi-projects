// ==========================================================
// corevester/models/user.js
// COREVESTER USER MODEL
// ==========================================================

const mongoose = require("mongoose");
const crypto = require("crypto");


// ==========================================================
// PASSWORD CONFIGURATION
// ==========================================================

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;


// ==========================================================
// HASH PASSWORD
// ==========================================================

function hashPassword(password) {

    return new Promise((resolve, reject) => {

        const salt =
            crypto.randomBytes(SALT_LENGTH);

        crypto.scrypt(
            password,
            salt,
            KEY_LENGTH,
            (err, derivedKey) => {

                if (err) {
                    return reject(err);
                }

                const saltHex =
                    salt.toString("hex");

                const hashHex =
                    derivedKey.toString("hex");

                resolve(
                    `${saltHex}:${hashHex}`
                );
            }
        );
    });
}


// ==========================================================
// VERIFY PASSWORD
// ==========================================================

function verifyPassword(
    password,
    storedPassword
) {

    return new Promise((resolve, reject) => {

        if (
            typeof storedPassword !== "string" ||
            !storedPassword.includes(":")
        ) {
            return resolve(false);
        }

        const parts =
            storedPassword.split(":");

        if (parts.length !== 2) {
            return resolve(false);
        }

        const saltHex = parts[0];
        const hashHex = parts[1];

        let salt;
        let originalHash;

        try {

            salt =
                Buffer.from(
                    saltHex,
                    "hex"
                );

            originalHash =
                Buffer.from(
                    hashHex,
                    "hex"
                );

        } catch (err) {

            return resolve(false);
        }

        if (
            !salt.length ||
            !originalHash.length
        ) {
            return resolve(false);
        }

        crypto.scrypt(
            password,
            salt,
            originalHash.length,
            (err, derivedKey) => {

                if (err) {
                    return reject(err);
                }

                if (
                    derivedKey.length !==
                    originalHash.length
                ) {
                    return resolve(false);
                }

                const valid =
                    crypto.timingSafeEqual(
                        derivedKey,
                        originalHash
                    );

                resolve(valid);
            }
        );
    });
}


// ==========================================================
// USER SCHEMA
// ==========================================================

const userSchema =
    new mongoose.Schema(
        {

            // ------------------------------------------------
            // NAME
            // ------------------------------------------------
            //
            // Matches the signup EJS:
            //
            // <input name="name">
            //
            // ------------------------------------------------

            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200
            },


            // ------------------------------------------------
            // EMAIL
            // ------------------------------------------------

            email: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                lowercase: true,
                index: true
            },


            // ------------------------------------------------
            // PASSWORD
            // ------------------------------------------------
            //
            // Matches:
            //
            // <input name="password">
            //
            // Stored as:
            //
            //     salt:hash
            //
            // ------------------------------------------------

            password: {
                type: String,
                required: true,
                select: false
            },


            // ------------------------------------------------
            // ROLE
            // ------------------------------------------------
            //
            // Allowed:
            //
            //     admin
            //     client
            //
            // Default:
            //
            //     client
            //
            // ------------------------------------------------

            role: {
                type: String,
                enum: [
                    "admin",
                    "client"
                ],
                default: "client",
                required: true
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
    function(next) {

        if (this.email) {

            this.email =
                String(this.email)
                    .trim()
                    .toLowerCase();
        }

        next();
    }
);


// ==========================================================
// HASH PASSWORD BEFORE SAVE
// ==========================================================
//
// Only hashes when password is new or modified.
//
// This prevents an existing hash from being hashed again
// when another user field is changed.
// ==========================================================

userSchema.pre(
    "save",
    async function(next) {

        try {

            if (!this.isModified("password")) {
                return next();
            }

            this.password =
                await hashPassword(
                    this.password
                );

            next();

        } catch (err) {

            next(err);
        }
    }
);


// ==========================================================
// COMPARE PASSWORD
// ==========================================================
//
// Authentication service can use:
//
//     user.comparePassword(password)
//
// ==========================================================

userSchema.methods.comparePassword =
    async function(password) {

        if (
            !password ||
            !this.password
        ) {
            return false;
        }

        return verifyPassword(
            password,
            this.password
        );
    };


// ==========================================================
// SAFE JSON OUTPUT
// ==========================================================
//
// Never expose the password hash when converting the user
// document to JSON.
// ==========================================================

userSchema.methods.toJSON =
    function() {

        const user =
            this.toObject();

        delete user.password;

        return user;
    };


// ==========================================================
// MODEL
// ==========================================================

const CorevesterUser =
    mongoose.model(
        "CorevesterUser",
        userSchema
    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    CorevesterUser;