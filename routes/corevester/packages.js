console.log("... Loading routes/corevester/packages.js");
const express = require("express");
const router = express.Router();

let packageService;
try {
    packageService = require("../../services/corevester/packageService");
    console.log("✅ packageService loaded in routes");
} catch (err) {
    console.error("❌ FAILED to load packageService in routes/corevester/packages.js");
    console.error(err.message);
    console.error(err.stack);
    router.get("/", (req,res)=> res.status(500).send("packageService load failed: " + err.message + "<pre>" + err.stack + "</pre>"));
    module.exports = router;
    return;
}

const getSessionId = (req) => {
    try {
        if (req.user && req.user._id) return req.user._id.toString();
        if (req.sessionID) return req.sessionID;
        return req.ip || "anon";
    } catch(e){ return "anon"; }
};

router.post("/create-from-cart", async (req,res)=>{
    try{
        console.log("[POST /packages/create-from-cart]");
        const pkg = await packageService.createFromCart(getSessionId(req));
        res.json({ success: true, packageId: pkg._id });
    }catch(err){
        console.error("create-from-cart error:", err.message, err.stack);
        res.status(400).json({ success:false, message: err.message });
    }
});

router.get("/", async (req,res)=>{
    try{
        const packages = await packageService.getClientPackages(getSessionId(req));
        res.render("corevester/packages", { packages, title: "My Packages", currentPath: req.path });
    }catch(err){
        console.error("GET /packages error:", err.message, err.stack);
        res.status(500).send(err.message + "<pre>" + err.stack + "</pre>");
    }
});

router.get("/:id", async (req,res)=>{
    try{
        const pkg = await packageService.getPackageById(req.params.id);
        if(!pkg) return res.status(404).send("Package not found");
        res.render("package-details", { pkg, title: "Package Details", currentPath: req.path });
    }catch(err){
        console.error("GET /packages/:id error:", err.message, err.stack);
        res.status(500).send(err.message);
    }
});

console.log("✅ routes/corevester/packages.js loaded");
module.exports = router;