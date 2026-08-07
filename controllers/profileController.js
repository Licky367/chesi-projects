const profileService = require("../services/profileService");

exports.profilePage = async (req, res) => {
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
        return res.redirect("/login");
    }

    const user = await profileService.getUser(userId);

    res.render("profile", { user });
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) {
            return res.redirect("/login");
        }

        await profileService.updateUser(
            userId,
            req.body,
            req.file // ✅ needed for profile image upload
        );

        res.redirect("/profile");

    } catch (err) {
        res.status(500).send("Profile update failed");
    }
};