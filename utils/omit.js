const mongoose = require("mongoose");
const Product = require("../models/products");


// ==========================================================
// MONGODB CONNECTION
// ==========================================================

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/verrah";


// ==========================================================
// REMOVE PRODUCTS WITH STRING CATEGORY
// ==========================================================

async function omit() {

  try {

    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB.");


    const result = await Product.deleteMany({
      category: {
        $type: "string"
      }
    });


    console.log(
      `Removed ${result.deletedCount} product(s) with string category.`
    );


  } catch (error) {

    console.error(
      "OMIT ERROR:",
      error
    );

    process.exitCode = 1;

  } finally {

    await mongoose.connection.close();

    console.log("MongoDB connection closed.");

  }

}


// ==========================================================
// RUN
// ==========================================================

omit();