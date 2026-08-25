// ==========================================================
// utils/seedUser.js
// ==========================================================
//
// PURPOSE:
//     Seed a single admin user into the "users" collection.
//
// USER:
//     name     = Licky
//     email    = licky1@gmail.com
//     password = 123456
//     role     = admin
//
// USAGE:
//     node utils/seedUser.js
//
// ==========================================================

require("dotenv").config();

const mongoose = require("mongoose");


// ==========================================================
// CONFIGURATION
// ==========================================================

const MONGO_URI =
    process.env.MONGO_URI;


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

    try {

        if (!MONGO_URI) {

            throw new Error(
                "MONGO_URI is not defined in .env"
            );

        }


        console.log(
            "Connecting to MongoDB..."
        );


        await mongoose.connect(
            MONGO_URI
        );


        const db =
            mongoose.connection.db;


        console.log(
            `Connected to database: ${db.databaseName}`
        );


        // --------------------------------------------------
        // CHECK WHETHER USER ALREADY EXISTS
        // --------------------------------------------------

        const existingUser =
            await db
                .collection("users")
                .findOne({

                    email:
                        USER_DATA.email

                });


        if (existingUser) {

            console.log(
                `⚠️ User already exists: ${USER_DATA.email}`
            );

            return;

        }


        // --------------------------------------------------
        // CREATE ADMIN USER
        // --------------------------------------------------

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


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        console.log(
            "\n=========================================="
        );

        console.log(
            "ADMIN USER SEEDED SUCCESSFULLY"
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


    } catch (error) {

        console.error(
            "\n❌ Failed to seed user:"
        );

        console.error(
            error
        );

        process.exitCode = 1;

    } finally {

        await mongoose.disconnect();

        console.log(
            "\nMongoDB connection closed."
        );

    }

}


// ==========================================================
// RUN
// ==========================================================

seedUser();