const User = require("../models/projectUser");

/**
 * Get user profile
 */
exports.getUser = async (id) => {
    return await User.findById(id);
};

/**
 * Update user profile
 * - name
 * - email
 * - phone
 * - optional profile image
 * - optional password change
 */
exports.updateUser = async (id, data, file = null) => {

    // Password is needed for verification
    const user = await User.findById(id).select("+password");

    if (!user) {
        throw new Error("User not found");
    }

    // =========================
    // NAME
    // =========================
    if (data.name) {
        user.name = data.name.trim();
    }

    // =========================
    // EMAIL
    // =========================
    if (data.email) {

        const email = data.email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email,
            _id: { $ne: id }
        });

        if (existingUser) {
            throw new Error("Email address is already in use.");
        }

        user.email = email;
    }

    // =========================
    // PHONE
    // =========================
    if (data.phone) {
        user.phone = data.phone.trim();
    }

    // =========================
    // PROFILE IMAGE
    // =========================
    if (file) {
        user.profileImage = file.filename;
    }

    // =========================
    // CHANGE PASSWORD
    // =========================
    const wantsPasswordChange =
        data.password ||
        data.newPassword ||
        data.confirmNewPassword;

    if (wantsPasswordChange) {

        if (!data.password) {
            throw new Error("Current password is required.");
        }

        const isMatch = await user.comparePassword(data.password);

        if (!isMatch) {
            throw new Error("Current password is incorrect.");
        }

        if (!data.newPassword) {
            throw new Error("New password is required.");
        }

        if (data.newPassword !== data.confirmNewPassword) {
            throw new Error("New passwords do not match.");
        }

        if (data.newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters.");
        }

        // Let the model hash it via pre("save")
        user.password = data.newPassword;
    }

    await user.save();

    // Don't return the password hash
    user.password = undefined;

    return user;
};