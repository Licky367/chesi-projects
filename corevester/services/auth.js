// ==========================================================
// corevester/services/auth.js
// COREVESTER AUTH SERVICE
// ==========================================================

const User =
    require("../models/user");


// ==========================================================
// CLEAN STRING
// ==========================================================

function cleanString(
    value
) {

    return String(
        value ?? ""
    )
        .trim();

}


// ==========================================================
// NORMALIZE EMAIL
// ==========================================================

function normalizeEmail(
    email
) {

    return cleanString(
        email
    )
        .toLowerCase();

}


// ==========================================================
// SAFE SESSION USER
// ==========================================================
//
// This is the function expected by:
//
//     controllers/auth.js
//
// It removes sensitive/internal information before the user
// is stored inside the session.
//
// ==========================================================

exports.toSessionUser =
function(
    user
) {

    if (
        !user
    ) {
        return null;
    }


    return {

        _id:
            String(
                user._id
            ),

        name:
            user.name,

        email:
            user.email,

        role:
            user.role

    };

};


// ==========================================================
// REGISTER USER
// ==========================================================
//
// IMPORTANT:
//
// Password hashing DOES NOT happen here.
//
// The plaintext password is passed to:
//
//     new User({ password })
//
// Then:
//
//     user.save()
//
// triggers the pre("save") middleware in:
//
//     models/user.js
//
// ==========================================================

exports.register =
async function(
    data
) {

    data =
        data || {};


    // ------------------------------------------------------
    // READ INPUT
    // ------------------------------------------------------

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
    // VALIDATE NAME
    // ------------------------------------------------------

    if (
        !name
    ) {

        throw new Error(
            "Name is required."
        );

    }


    // ------------------------------------------------------
    // VALIDATE EMAIL
    // ------------------------------------------------------

    if (
        !email
    ) {

        throw new Error(
            "Email is required."
        );

    }


    // ------------------------------------------------------
    // VALIDATE PASSWORD
    // ------------------------------------------------------

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
    // CHECK EXISTING USER
    // ------------------------------------------------------

    const existingUser =
        await User.findOne(
            {
                email:
                    email
            }
        );


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
    // DO NOT HASH PASSWORD HERE.
    //
    // models/user.js handles hashing in:
    //
    //     pre("save")
    //
    // ------------------------------------------------------

    const user =
        new User(
            {

                name:
                    name,

                email:
                    email,

                password:
                    password,

                role:
                    "client"

            }
        );


    // ------------------------------------------------------
    // SAVE USER
    // ------------------------------------------------------
    //
    // This triggers the User model's password hashing hook.
    //
    // ------------------------------------------------------

    await user.save();


    // ------------------------------------------------------
    // RETURN USER
    // ------------------------------------------------------

    return user;

};


// ==========================================================
// LOGIN USER
// ==========================================================

exports.login =
async function(
    data
) {

    data =
        data || {};


    // ------------------------------------------------------
    // READ INPUT
    // ------------------------------------------------------

    const email =
        normalizeEmail(
            data.email
        );


    const password =
        String(
            data.password ?? ""
        );


    // ------------------------------------------------------
    // VALIDATE
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
    // password in models/user.js uses:
    //
    //     select: false
    //
    // Therefore we MUST explicitly request it.
    //
    // Without this:
    //
    //     user.password === undefined
    //
    // and comparePassword() always fails.
    //
    // ------------------------------------------------------

    const user =
        await User
            .findOne(
                {
                    email:
                        email
                }
            )
            .select(
                "+password"
            );


    // ------------------------------------------------------
    // USER NOT FOUND
    // ------------------------------------------------------

    if (
        !user
    ) {

        throw new Error(
            "Invalid email or password."
        );

    }


    // ------------------------------------------------------
    // COMPARE PASSWORD
    // ------------------------------------------------------

    const isPasswordCorrect =
        await user.comparePassword(
            password
        );


    // ------------------------------------------------------
    // PASSWORD INCORRECT
    // ------------------------------------------------------

    if (
        !isPasswordCorrect
    ) {

        throw new Error(
            "Invalid email or password."
        );

    }


    // ------------------------------------------------------
    // LOGIN SUCCESS
    // ------------------------------------------------------

    return user;

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


    return user;

};