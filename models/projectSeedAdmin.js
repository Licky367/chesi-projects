const mongoose = require("mongoose");
const User = require("./projectUser");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/project_db";

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected...");

    // 🔍 Check if ANY admin already exists (not by email)
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // 🆕 Create default admin only if none exists
    const adminUser = await User.create({
      profileImage: "",
      name: "Project Admin",
      phone: "0700000000",
      email: "admin@corevester.com",
      password: "Admin@123",
      role: "admin",
    });

    console.log("Admin seeded successfully:", adminUser.email);
    process.exit(0);

  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();