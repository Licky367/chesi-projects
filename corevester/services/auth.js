// ==========================================================
// corevester/services/auth.js
// COREVESTER AUTH SERVICE
// ==========================================================

const User =
    require("../models/user");


// ==========================================================
// HELPERS
// ==========================================================

function cleanString(
    value
) {

    return String(
        value ?? ""
    )
        .trim();

}


function normalizeEmail(
    email
) {

    return cleanString(
        email
    )
        .toLowerCase();

}


// ==========================================================
// REGISTER USER
// ==========================================================
//
// IMPORTANT:
//
// Do NOT hash the password here.
//
// The User model is responsible for:
//
//     password
//         ↓
//     User pre("save")
//         ↓
//     scrypt
//         ↓
//     salt:hash
//
// ==========================================================

exports.register =
async function(
    data
) {

    const name =
        cleanString(
            data.name
        );


    const email =
        normalizeEmail(
            data.email
        );


    const password =
        String(
            data.password ?? ""
        );


    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (
        !name
    ) {
        throw new Error(
            "Name is required."
        );
    }


    if (
        !email
    ) {
        throw new Error(
            "Email is required."
        );
    }


    if (
        !password
    ) {
        throw new Error(
            "Password is required."
        );
    }


    if (
        password.length < 6
    ) {
        throw new Error(
            "Password must be at least 6 characters."
        );
    }


    // ------------------------------------------------------
    // CHECK EXISTING EMAIL
    // ------------------------------------------------------

    const existingUser =
        await User.findOne({
            email: email
        });


    if (
        existingUser
    ) {
        throw new Error(
            "An account with this email already exists."
        );
    }


    // ------------------------------------------------------
    // CREATE USER
    // ------------------------------------------------------
    //
    // Password is intentionally passed as plaintext.
    //
    // models/user.js hashes it inside:
    //
    //     pre("save")
    //
    // ------------------------------------------------------

    const user =
        new User({

            name,

            email,

            password,

            role: "client"

        });


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------
    //
    // This triggers:
    //
    // User pre("save")
    //     ↓
    // password hashing
    //
    // ------------------------------------------------------

    await user.save();


    // ------------------------------------------------------
    // RETURN SAFE USER
    // ------------------------------------------------------

    return {

        _id:
            user._id,

        name:
            user.name,

        email:
            user.email,

        role:
            user.role

    };

};


// ==========================================================
// LOGIN USER
// ==========================================================

exports.login =
async function(
    data
) {

    const email =
        normalizeEmail(
            data.email
        );


    const password =
        String(
            data.password ?? ""
        );


    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (
        !email ||
        !password
    ) {
        throw new Error(
            "Email and password are required."
        );
    }


    // ------------------------------------------------------
    // FIND USER
    // ------------------------------------------------------
    //
    // CRITICAL:
    //
    // models/user.js contains:
    //
    // password: {
    //     select: false
    // }
    //
    // Therefore a normal:
    //
    // User.findOne({ email })
    //
    // DOES NOT return the password hash.
    //
    // We MUST explicitly include it.
    //
    // ------------------------------------------------------

    const user =
        await User
            .findOne({

                email: email

            })
            .select(
                "+password"
            );


    // ------------------------------------------------------
    // USER DOES NOT EXIST
    // ------------------------------------------------------

    if (
        !user
    ) {
        throw new Error(
            "Invalid email or password."
        );
    }


    // ------------------------------------------------------
    // VERIFY PASSWORD
    // ------------------------------------------------------
    //
    // models/user.js:
    //
    // user.comparePassword(password)
    //
    // compares:
    //
    // entered plaintext password
    //
    // against:
    //
    // stored salt:hash
    //
    // ------------------------------------------------------

    const isPasswordCorrect =
        await user.comparePassword(
            password
        );


    if (
        !isPasswordCorrect
    ) {
        throw new Error(
            "Invalid email or password."
        );
    }


    // ------------------------------------------------------
    // RETURN SAFE USER
    // ------------------------------------------------------
    //
    // Never return the password hash.
    //
    // ------------------------------------------------------

    return {

        _id:
            user._id,

        name:
            user.name,

        email:
            user.email,

        role:
            user.role

    };

};


// ==========================================================
// GET USER BY ID
// ==========================================================

exports.getUserById =
async function(
    userId
) {

    if (
        !userId
    ) {
        return null;
    }


    const user =
        await User.findById(
            userId
        );


    if (
        !user
    ) {
        return null;
    }


    return {

        _id:
            user._id,

        name:
            user.name,

        email:
            user.email,

        role:
            user.role

    };

};