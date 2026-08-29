// ==========================================================
// corevester/models/user.js
// COREVESTER USER MODEL
// ==========================================================

const mongoose = require("mongoose");
const crypto = require("crypto");


// ==========================================================
// PASSWORD HASHING
// ==========================================================

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

function hashPassword(password) {
    return new Promise((resolve, reject) => {

        const salt = crypto.randomBytes(SALT_LENGTH);

        crypto.scrypt(
            password,
            salt,
            KEY_LENGTH,
            (err, derivedKey) => {

                if (err) {
                    return reject(err);
                }

                resolve(
                    `${salt.toString("hex")}:${derivedKey.toString("hex")}`
                );
            }
        );
    });
}


// ==========================================================
// PASSWORD VERIFICATION
// ==========================================================

function verifyPassword(password, storedPassword) {
    return new Promise((resolve, reject) => {

        if (
            typeof storedPassword !== "string" ||
            !storedPassword.includes(":")
        ) {
            return resolve(false);
        }

        const [saltHex, hashHex] =
            storedPassword.split(":");

        if (!saltHex || !hashHex) {
            return resolve(false);
        }

        let salt;
        let originalHash;

        try {
            salt = Buffer.from(saltHex, "hex");
            originalHash = Buffer.from(hashHex, "hex");
        } catch (err) {
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

                resolve(
                    crypto.timingSafeEqual(
                        derivedKey,
                        originalHash
                    )
                );
            }
        );
    });
}


// ==========================================================
// SCHEMA
// ==========================================================

const userSchema = new mongoose.Schema(
    {

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------
        //
        // Matches the signup EJS:
        //
        // <input name="name">
        //
        // --------------------------------------------------

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
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
            index: true
        },


        // --------------------------------------------------
        // PASSWORD
        // --------------------------------------------------
        //
        // Matches:
        //
        // <input name="password">
        //
        // The password is hashed automatically before save.
        //
        // It is excluded from normal queries.
        //
        // --------------------------------------------------

        password: {
            type: String,
            required: true,
            select: false
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

userSchema.pre(
    "save",
    async function(next) {

        try {

            // Do not hash again when another field changes.
            if (!this.isModified("password")) {
                return next();
            }

            this.password =
                await hashPassword(this.password);

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
// Used by authentication:
//
//     user.comparePassword(password)
//
// ==========================================================

userSchema.methods.comparePassword =
    async function(password) {

        if (!password || !this.password) {
            return false;
        }

        return verifyPassword(
            password,
            this.password
        );
    };


// ==========================================================
// REMOVE PASSWORD FROM JSON
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