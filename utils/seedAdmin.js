const User = require("../models/projectUser");

const seedAdmin = async () => {
  try {
    const admin = await User.findOneAndUpdate(
      { email: "admin@chessyprojects.com" },
      {
        profileImage: "",
        name: "Project Admin",
        phone: "0700000000",
        password: "Admin@123",
        role: "admin",
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    console.log("🟢 Admin ready:", admin.email);

  } catch (err) {
    console.error("🔴 Error seeding admin:", err.message);
  }
};

module.exports = seedAdmin;