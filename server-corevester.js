// ==========================================================
// server-corevester.js - COREVESTER - FIXED LOGGING + YOUR VIEW ENGINE
// ==========================================================

const express = require("express");
const http = require("http");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const { rateLimit } = require("express-rate-limit");
const { Server } = require("socket.io");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const methodOverride = require("method-override");
require("dotenv").config();

// --- CRITICAL: SHOW ALL CRASHES IN RENDER LOGS ---
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err.message);
    console.error(err.stack);
    setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ UNHANDLED REJECTION:', reason?.message || reason);
    console.error(reason?.stack || reason);
});

console.log("--- Starting server-corevester.js ---");

// ==========================================================
// CONNECT-MONGO
// ==========================================================
let MongoStore;
try {
    MongoStore = require("connect-mongo");
    console.log("✅ connect-mongo loaded");
} catch (error) {
    console.warn("⚠️ connect-mongo not installed:", error.message);
}

// ==========================================================
// ENV
// ==========================================================
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
    const required = ["MONGO_URI", "SESSION_SECRET", "FRONTEND_URL"];
    const missing = required.filter(k =>!process.env[k]);
    if (missing.length) {
        console.error(`❌ Missing env: ${missing.join(", ")}`);
        process.exit(1);
    }
}

// ==========================================================
// DB + SEED
// ==========================================================
const connectDB = require("./db");
const seedUser = require("./utils/seedUser");

// ==========================================================
// ROUTES - VERBOSE SAFE LOAD
// ==========================================================
function safeLoad(name, pathToRequire) {
    try {
        console.log(`... Loading ${name}`);
        const mod = require(pathToRequire);
        console.log(`✅ Loaded ${name}`);
        return mod;
    } catch (err) {
        console.error(`❌ FAILED to load ${name}: ${pathToRequire}`);
        console.error(err.message);
        console.error(err.stack);
        return null;
    }
}

const corevesterRoutes = safeLoad("corevesterRoutes", "./routes/corevester/index");
const productsRoutes = safeLoad("productsRoutes", "./routes/corevester/products");
const productsEntryRoutes = safeLoad("productsEntryRoutes", "./routes/corevester/adminProducts");
const stockEntryRoutes = safeLoad("stockEntryRoutes", "./routes/corevester/stock");
const packageRoutes = safeLoad("packageRoutes", "./routes/corevester/packages");

const socketHandler = require("./socket/socket");

// ==========================================================
// APP
// ==========================================================
const app = express();
const server = http.createServer(app);
app.disable("x-powered-by");
if (isProduction || process.env.TRUST_PROXY === "1") app.enable("trust proxy");

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction? 200 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests" }
}));
app.use(compression());
app.use(morgan(process.env.MORGAN_FORMAT || "combined"));

const allowedOrigin = process.env.FRONTEND_URL || (isProduction? false : "*");
const io = new Server(server, { cors: { origin: allowedOrigin, methods: ["GET", "POST"] } });
app.set("io", io);
socketHandler(io);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(methodOverride("_method"));

// ==========================================================
// SESSION
// ==========================================================
const sessionStore = isProduction && process.env.MONGO_URI && MongoStore
 ? MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 24*60*60, touchAfter: 60*60 })
   : undefined;

app.use(session({
    secret: process.env.SESSION_SECRET || "development-session-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 86400000 }
}));

app.use((req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.req = req;
    res.locals.currentPath = req.path;
    req.user = res.locals.user;
    next();
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ==========================================================
// VIEW ENGINE - FIXED TO YOUR CORRECT PATH
// ==========================================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/corevester")); // YOUR CORRECT PATH
app.use(expressLayouts);
app.set("layout", "layout"); // YOUR CORRECT LAYOUT
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

console.log("✅ Views:", path.join(__dirname, "views/corevester"));
console.log("✅ Layout: layout");

// ==========================================================
// MOUNT
// ==========================================================
console.log("--- Mounting routes ---");
if (corevesterRoutes) { app.use("/", corevesterRoutes); console.log("Mounted /"); }
if (productsRoutes) { app.use("/products", productsRoutes); console.log("Mounted /products"); }
if (productsEntryRoutes) { app.use("/admin/products", productsEntryRoutes); console.log("Mounted /admin/products"); }
if (stockEntryRoutes) { app.use("/admin/stock", stockEntryRoutes); console.log("Mounted /admin/stock"); }
if (packageRoutes) { app.use("/packages", packageRoutes); console.log("Mounted /packages"); }

// ==========================================================
// 404 - FIXED TO YOUR CORRECT ERROR PATH
// ==========================================================
app.use((req, res) => {
    if (req.accepts("json") &&!req.accepts("html")) {
        return res.status(404).json({ success: false, message: "Route not found" });
    }
    return res.status(404).render("error/404", {
        title: "404 - Page Not Found",
        user: req.user || null,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// ==========================================================
// GLOBAL ERROR HANDLER - FIXED TO YOUR CORRECT ERROR PATH
// ==========================================================
app.use((err, req, res, next) => {
    console.error("❌ Unhandled error:", err.message);
    console.error(err.stack);

    let statusCode = Number(err.statusCode || err.status || 500);
    if (err && err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
        statusCode = 400;
        err.message = "The uploaded image is too large. Maximum size is 5MB.";
    }
    if (statusCode < 400 || statusCode > 599) statusCode = 500;

    if (!req.accepts("html") || req.xhr || req.path.startsWith("/api")) {
        return res.status(statusCode).json({
            success: false,
            message: isProduction && statusCode === 500? "Internal Server Error" : err.message || "Something went wrong"
        });
    }

    const errorViews = {
        400: "error/400", 401: "error/401", 403: "error/403", 404: "error/404",
        409: "error/409", 422: "error/422", 429: "error/429", 500: "error/500"
    };
    const view = errorViews[statusCode] || "error/500";

    return res.status(statusCode).render(view, {
        title: `${statusCode} Error`,
        error: err.message || "Internal Server Error",
        statusCode: statusCode,
        user: req.user || null
    });
});

const PORT = Number(process.env.PORT || 3000);
const startServer = (p) => server.listen(p, () => console.log(`🚀 Running on ${p}`));

server.on("error", (e) => {
    console.error("❌ Server error:", e.message, e.stack);
    process.exit(1);
});

const bootstrap = async () => {
    try {
        console.log("--- Connecting DB ---");
        const dbConnected = await connectDB();
        if (dbConnected) {
            console.log("✅ MongoDB connected");
            await seedUser();
            console.log("✅ Seed done");
        }
        startServer(PORT);
    } catch (error) {
        console.error("❌ Bootstrap failed:", error.message);
        console.error(error.stack);
        if (isProduction) process.exit(1);
        startServer(PORT);
    }
};

bootstrap();