const packageService = require("../../services/packageService");

exports.confirm = async (req, res) => {
    try {
        await packageService.confirmPackage(
            req,
            req.params.id
        );

        return res.redirect(
            `/packages/staff/${req.params.id}?success=${encodeURIComponent(
                "Package confirmed for the selected pickup substation."
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
