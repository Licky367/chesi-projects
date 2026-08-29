// ==========================================================
// corevester/utils/seedUser.js
// COREVESTER DEFAULT ADMIN USER SEED
// ==========================================================
//
// PURPOSE:
//     Create the default administrator account if it does not
//     already exist.
//
// IMPORTANT:
//     The User model handles password hashing automatically
//     through its pre-save middleware using Node.js crypto.
//
//     DO NOT hash the password here.
//
// USER:
//     name     = Licky
//     email    = licky367@gmail.com
//     password = 123456
//     role     = admin
//
// ==========================================================

const User =
    require("../models/user");


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
        // CHECK WHETHER ADMIN ALREADY EXISTS
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
                created: false,
                existing: true,
                user: existingUser
            };
        }


        // --------------------------------------------------
        // CREATE ADMIN USER
        // --------------------------------------------------
        //
        // Password is intentionally passed in plain text.
        //
        // The User model automatically hashes it with crypto
        // before MongoDB saves the document.
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
            "Password: securely hashed by User model"
        );


        return {
            created: true,
            existing: false,
            user
        };

    } catch (error) {

        console.error(
            "\n❌ Failed to seed default admin user:"
        );

        console.error(error);

        throw error;
    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    seedUser;