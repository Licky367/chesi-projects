// ==========================================================
// utils/seedUser.js
// ==========================================================
//
// PURPOSE:
//     Seed the default administrator user.
//
// IMPORTANT:
//     This utility is called by server.js AFTER MongoDB
//     has successfully connected.
//
//     The User model is used so that:
//         • Mongoose validation runs
//         • Password middleware runs
//         • Password is bcrypt-hashed automatically
//         • The correct collection is used
//
// USER:
//     name     = Licky
//     email    = licky367@gmail.com
//     password = 123456
//     role     = admin
//
// ==========================================================

const User =
    require("../models/projectUser");


// ==========================================================
// DEFAULT ADMIN USER
// ==========================================================

const USER_DATA = {

    name:
        "Licky",

    email:
        "licky367@gmail.com",

    password:
        "123456",

    role:
        "admin"

};


// ==========================================================
// SEED USER
// ==========================================================

async function seedUser() {

    try {

        // --------------------------------------------------
        // CHECK WHETHER USER ALREADY EXISTS
        // --------------------------------------------------

        const existingUser =
            await User.findOne({

                email:
                    USER_DATA.email

            });


        // --------------------------------------------------
        // USER ALREADY EXISTS
        // --------------------------------------------------

        if (existingUser) {

            console.log(
                `🛡️ Default admin user already exists: ${USER_DATA.email}`
            );

            return {

                created:
                    false,

                existing:
                    true,

                user:
                    existingUser

            };

        }


        // --------------------------------------------------
        // CREATE USER
        // --------------------------------------------------
        //
        // DO NOT HASH THE PASSWORD HERE.
        //
        // The User model contains:
        //
        //     userSchema.pre("save", ...)
        //
        // which automatically bcrypt-hashes the password.
        //
        // --------------------------------------------------

        const user =
            new User({

                name:
                    USER_DATA.name,

                email:
                    USER_DATA.email,

                password:
                    USER_DATA.password,

                role:
                    USER_DATA.role

            });


        await user.save();


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        console.log(
            "\n=========================================="
        );

        console.log(
            "DEFAULT ADMIN USER CREATED"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Name: ${user.name}`
        );

        console.log(
            `Email: ${user.email}`
        );

        console.log(
            `Role: ${user.role}`
        );

        console.log(
            `ID: ${user._id}`
        );

        console.log(
            "Password: bcrypt hashed automatically"
        );


        return {

            created:
                true,

            existing:
                false,

            user

        };

    } catch (error) {

        console.error(
            "\n❌ Failed to seed default admin user:"
        );

        console.error(
            error
        );

        throw error;

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    seedUser;