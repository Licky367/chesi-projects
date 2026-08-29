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

    return new Promise(
        (resolve, reject) => {

            const salt =
                crypto.randomBytes(
                    SALT_LENGTH
                );


            crypto.scrypt(
                String(password),
                salt,
                KEY_LENGTH,
                (
                    err,
                    derivedKey
                ) => {

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

        }
    );

}


// ==========================================================
// VERIFY PASSWORD
// ==========================================================

function verifyPassword(
    password,
    storedPassword
) {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof password !== "string" ||
                typeof storedPassword !== "string"
            ) {
                return resolve(false);
            }


            const parts =
                storedPassword.split(":");


            if (
                parts.length !== 2
            ) {
                return resolve(false);
            }


            const [
                saltHex,
                hashHex
            ] = parts;


            if (
                !saltHex ||
                !hashHex
            ) {
                return resolve(false);
            }


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
                (
                    err,
                    derivedKey
                ) => {

                    if (err) {
                        return reject(err);
                    }


                    if (
                        derivedKey.length !==
                        originalHash.length
                    ) {
                        return resolve(false);
                    }


                    return resolve(
                        crypto.timingSafeEqual(
                            derivedKey,
                            originalHash
                        )
                    );

                }
            );

        }
    );

}


// ==========================================================
// CHECK HASH FORMAT
// ==========================================================
//
// Prevents accidental double hashing.
//
// A valid stored password is:
//
//     saltHex:hashHex
//
// ==========================================================

function isPasswordHash(
    password
) {

    if (
        typeof password !== "string"
    ) {
        return false;
    }


    const parts =
        password.split(":");


    if (
        parts.length !== 2
    ) {
        return false;
    }


    const [
        saltHex,
        hashHex
    ] = parts;


    return (
        /^[a-f0-9]+$/i.test(
            saltHex
        ) &&
        /^[a-f0-9]+$/i.test(
            hashHex
        )
    );

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
            // Stored internally as:
            //
            //     salt:hash
            //
            // select: false means authentication must explicitly
            // request it with:
            //
            // .select("+password")
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

        if (
            this.email
        ) {

            this.email =
                String(
                    this.email
                )
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
// Password is hashed only when:
//
// 1. It is new or modified
// 2. It is NOT already a salt:hash value
//
// ==========================================================

userSchema.pre(
    "save",

    async function(next) {

        try {

            if (
                !this.isModified(
                    "password"
                )
            ) {
                return next();
            }


            if (
                !this.password
            ) {
                return next();
            }


            // Prevent accidental double hashing.

            if (
                isPasswordHash(
                    this.password
                )
            ) {
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
// IMPORTANT:
//
// Because password has:
//
//     select: false
//
// The login service MUST retrieve it:
//
// const user =
//     await User.findOne({ email })
//         .select("+password");
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
            String(password),
            this.password
        );

    };


// ==========================================================
// SAFE JSON OUTPUT
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