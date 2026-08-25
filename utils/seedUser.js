// ==========================================================
// utils/seedUser.js
// ==========================================================
//
// PURPOSE:
//     Seed the default administrator user.
//
//     This utility is designed to be called by server.js
//     AFTER MongoDB has successfully connected.
//
// USER:
//     name     = Licky
//     email    = licky1@gmail.com
//     password = 123456
//     role     = admin
//
// IMPORTANT:
//     This file does NOT create its own MongoDB connection.
//     server.js is responsible for connecting to MongoDB.
//
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// USER DATA
// ==========================================================

const USER_DATA = {

    name: "Licky",

    email: "licky1@gmail.com",

    password: "123456",

    role: "admin"

};


// ==========================================================
// SEED USER
// ==========================================================

async function seedUser() {

    // ------------------------------------------------------
    // VERIFY MONGOOSE CONNECTION
    // ------------------------------------------------------

    if (
        mongoose.connection.readyState !== 1
    ) {

        throw new Error(
            "Cannot seed user: MongoDB is not connected."
        );

    }


    // ------------------------------------------------------
    // GET DATABASE
    // ------------------------------------------------------

    const db =
        mongoose.connection.db;


    // ------------------------------------------------------
    // CHECK WHETHER USER ALREADY EXISTS
    // ------------------------------------------------------

    const existingUser =
        await db
            .collection("users")
            .findOne({

                email:
                    USER_DATA.email

            });


    // ------------------------------------------------------
    // USER ALREADY EXISTS
    // ------------------------------------------------------

    if (existingUser) {

        console.log(
            `🛡️ Default user already exists: ${USER_DATA.email}`
        );

        return {

            created: false,

            existing: true,

            user: existingUser

        };

    }


    // ------------------------------------------------------
    // CREATE USER
    // ------------------------------------------------------

    const now =
        new Date();


    const result =
        await db
            .collection("users")
            .insertOne({

                name:
                    USER_DATA.name,

                email:
                    USER_DATA.email,

                password:
                    USER_DATA.password,

                role:
                    USER_DATA.role,

                createdAt:
                    now,

                updatedAt:
                    now

            });


    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

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
        `Name: ${USER_DATA.name}`
    );

    console.log(
        `Email: ${USER_DATA.email}`
    );

    console.log(
        `Role: ${USER_DATA.role}`
    );

    console.log(
        `ID: ${result.insertedId}`
    );


    return {

        created: true,

        existing: false,

        insertedId:
            result.insertedId

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    seedUser;