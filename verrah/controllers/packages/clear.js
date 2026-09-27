const packageService = require("../../services/packageService");

exports.clear = async (req, res) => {
    try {
        await packageService.clearPackage(
            req,
            req.params.id
        );

        return res.redirect(
            `/packages/staff/${req.params.id}?success=${encodeURIComponent(
                "Package marked as cleared."
            )}`
        );
    } catch (err) {
        console.error(err);

        return res.redirect(
            `/packages/staff/${req.params.id}?error=${encodeURIComponent(
                err.message
            )}`
        );
    }
};
