// ==========================================================
// server-corevester.js - COREVESTER - FIXED LOGGING
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

// --- CRITICAL: SHOW ALL CRASHES IN LOGS ---
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    console.error(err.stack);
    // don't exit immediately on Render, let log flush
    setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
    console.error(reason?.stack || reason);
});

console.log("--- Starting server-corevester.js ---");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);

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
// ENVIRONMENT
// ==========================================================
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
    const requiredEnvVars = ["MONGO_URI", "SESSION_SECRET", "FRONTEND_URL"];
    const missing = requiredEnvVars.filter((key) =>!process.env[key]);
    if (missing.length) {
        console.error(`❌ Missing env vars: ${missing.join(", ")}`);
        process.exit(1);
    }
}

// ==========================================================
// DATABASE
// ==========================================================
const connectDB = require("./db");
const seedUser = require("./utils/seedUser");

// ==========================================================
// ROUTES - LOAD WITH VERBOSE LOGGING
// ==========================================================
function safeLoad(name, pathToRequire) {
    try {
        console.log(`... Loading ${name} from ${pathToRequire}`);
        const mod = require(pathToRequire);
        console.log(`✅ Loaded ${name}`);
        return mod;
    } catch (err) {
        console.error(`❌ FAILED to load ${name} from ${pathToRequire}`);
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

// ==========================================================
// SOCKET
// ==========================================================
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
   ? MongoStore.create({ mongoUrl: process.env.MONGO_URI, ttl: 24 * 60 * 60, touchAfter: 60 * 60 })
    : undefined;

app.use(session({
    secret: process.env.SESSION_SECRET || (isProduction? "" : "development-session-secret"),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
    const currentUser = req.session?.user || null;
    req.user = currentUser;
    res.locals.user = currentUser;
    res.locals.req = req;
    res.locals.currentPath = req.path;
    next();
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok", env: process.env.NODE_ENV }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));



app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views/corevester"));
console.log("Views path set to:", path.join(__dirname, "views/corevester"));
app.set("layout", "layout"); // not corevester/layout

// and then fix all renders to NOT include corevester/


// ==========================================================
// MOUNT ROUTES - WITH LOG
// ==========================================================
console.log("--- Mounting routes ---");
if (corevesterRoutes) { app.use("/", corevesterRoutes); console.log("Mounted /"); }
else console.error("SKIPPED / - not loaded");

if (productsRoutes) { app.use("/products", productsRoutes); console.log("Mounted /products"); }
else console.error("SKIPPED /products - not loaded");

if (productsEntryRoutes) { app.use("/admin/products", productsEntryRoutes); console.log("Mounted /admin/products"); }
else console.error("SKIPPED /admin/products - not loaded");

if (stockEntryRoutes) { app.use("/admin/stock", stockEntryRoutes); console.log("Mounted /admin/stock"); }
else console.error("SKIPPED /admin/stock - not loaded");

if (packageRoutes) { app.use("/packages", packageRoutes); console.log("Mounted /packages"); }
else console.error("SKIPPED /packages - not loaded");

// ==========================================================
// 404
// ==========================================================
app.use((req, res) => {
    if (req.accepts("json") &&!req.accepts("html")) {
        return res.status(404).json({ success: false, message: "Route not found" });
    }
    return res.status(404).render("corevester/error/404", {
        title: "404 - Page Not Found",
        user: req.user || null,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================
app.use((err, req, res, next) => {
    console.error("❌ GLOBAL ERROR HANDLER:", err);
    console.error(err.stack);
    let statusCode = Number(err.statusCode || err.status || 500);
    if (statusCode < 400 || statusCode > 599) statusCode = 500;

    if (!req.accepts("html") || req.xhr || req.path.startsWith("/api")) {
        return res.status(statusCode).json({
            success: false,
            message: isProduction && statusCode === 500? "Internal Server Error" : err.message
        });
    }
    return res.status(statusCode).render(`corevester/error/${statusCode}`.includes("500")? "corevester/error/500" : "corevester/error/500", {
        title: `${statusCode} Error`,
        error: err.message,
        statusCode,
        user: req.user || null
    });
});

// ==========================================================
// START
// ==========================================================
const PORT = Number(process.env.PORT || 3000);

const startServer = (port) => {
    server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });
};

server.on("error", (error) => {
    console.error("❌ Server error:", error);
    console.error(error.stack);
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} in use`);
        process.exit(1);
    }
    process.exit(1);
});

process.on("SIGTERM", () => { console.log("SIGTERM"); server.close(() => process.exit(0)); });
process.on("SIGINT", () => { console.log("SIGINT"); server.close(() => process.exit(0)); });

const bootstrap = async () => {
    try {
        console.log("--- Connecting DB ---");
        const dbConnected = await connectDB();
        if (dbConnected) {
            console.log("✅ MongoDB connected");
            console.log("🌱 Seeding admin...");
            await seedUser();
            console.log("✅ Seed done");
        } else if (isProduction) {
            console.error("❌ MongoDB unavailable in production");
            process.exit(1);
        }
        startServer(PORT);
    } catch (error) {
        console.error("❌ Bootstrap failed:");
        console.error(error);
        console.error(error.stack);
        if (isProduction) process.exit(1);
        startServer(PORT);
    }
};

bootstrap();