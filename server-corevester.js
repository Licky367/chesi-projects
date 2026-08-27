// ==========================================================
// server-corevester.js - COREVESTER
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

// ==========================================================
// CONNECT-MONGO
// ==========================================================

let MongoStore;

try {
    MongoStore = require("connect-mongo");
} catch (error) {
    console.warn(
        "⚠️ connect-mongo is not installed; falling back to default session storage"
    );
}

// ==========================================================
// ENVIRONMENT
// ==========================================================

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
    const requiredEnvVars = ["MONGO_URI", "SESSION_SECRET", "FRONTEND_URL"];
    const missing = requiredEnvVars.filter((key) =>!process.env[key]);
    if (missing.length) {
        console.error(
            `❌ Production startup failed: missing required environment variables: ${missing.join(", ")}`
        );
        process.exit(1);
    }
}

// ==========================================================
// DATABASE
// ==========================================================

const connectDB = require("./db");

// ==========================================================
// DEFAULT ADMIN USER SEEDER
// ==========================================================

const seedUser = require("./utils/seedUser");

// ==========================================================
// ROUTES - ONLY COREVESTER
// ==========================================================

let corevesterRoutes;

try {
    corevesterRoutes = require("./routes/corevester/index");
} catch (err) {
    console.warn(
        "Warning: failed to load Core Vester routes:",
        err.message
    );
}


let productsRoutes;

try {
    productsRoutes = require("./routes/corevester/products");
} catch (err) {
    console.warn(
        "Warning: failed to load products routes:",
        err.message
    );
}


let productsEntryRoutes;

try {
    productsEntryRoutes = require("./routes/corevester/adminProducts");
} catch (err) {
    console.warn(
        "Warning: failed to load products-entry routes:",
        err.message
    );
}

let stockEntryRoutes;

try {
    stockEntryRoutes = require("./routes/corevester/stock");
} catch (err) {
    console.warn(
        "Warning: failed to load stock-entry routes:",
        err.message
    );
}
// ==========================================================
// SOCKET HANDLER
// ==========================================================

const socketHandler = require("./socket/socket");

// ==========================================================
// APP
// ==========================================================

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

// ==========================================================
// TRUST PROXY
// ==========================================================

if (isProduction || process.env.TRUST_PROXY === "1") {
    app.enable("trust proxy");
} else {
    app.disable("trust proxy");
}

// ==========================================================
// SECURITY
// ==========================================================

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);

// ==========================================================
// RATE LIMIT
// ==========================================================

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: isProduction? 200 : 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            message: "Too many requests, please try again later."
        }
    })
);

// ==========================================================
// COMPRESSION
// ==========================================================

app.use(compression());

// ==========================================================
// LOGGING
// ==========================================================

app.use(morgan(process.env.MORGAN_FORMAT || "combined"));

// ==========================================================
// SOCKET.IO
// ==========================================================

const allowedOrigin =
    process.env.FRONTEND_URL || (isProduction? false : "*");

const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ["GET", "POST"]
    }
});

app.set("io", io);
socketHandler(io);

// ==========================================================
// BODY PARSERS
// ==========================================================

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(
    express.json({
        limit: "10mb"
    })
);

// ==========================================================
// METHOD OVERRIDE
// ==========================================================

app.use(methodOverride("_method"));

// ==========================================================
// SESSION
// ==========================================================

const sessionStore =
    isProduction && process.env.MONGO_URI && MongoStore
       ? MongoStore.create({
              mongoUrl: process.env.MONGO_URI,
              ttl: 24 * 60 * 60,
              touchAfter: 60 * 60
          })
        : undefined;

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            (isProduction? "" : "development-session-secret"),
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// ==========================================================
// GLOBAL USER
// ==========================================================

app.use((req, res, next) => {
    const currentUser = req.session?.user || null;
    req.user = currentUser;
    res.locals.user = currentUser;
    res.locals.req = req;
    res.locals.currentPath = req.path;
    next();
});

// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok",
        environment: process.env.NODE_ENV || "development"
    });
});

// ==========================================================
// STATIC FILES
// ==========================================================

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ==========================================================
// VIEW ENGINE
// ==========================================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/corevester"));

app.use(expressLayouts);
app.set("layout", "layout");

// ==========================================================
// ROUTE MOUNTING - ONLY COREVESTER
// ==========================================================

if (corevesterRoutes) {
    app.use("/", corevesterRoutes);
}

if (productsRoutes) {
    app.use("/products", productsRoutes);
}

if (productsEntryRoutes) {
    app.use("/admin/products", productsEntryRoutes);
}


if (stockEntryRoutes) {
    app.use("/admin/stock", stockEntryRoutes);
}

// ==========================================================
// 404 - PERFECT HANDLER
// ==========================================================

app.use((req, res) => {
    // If API / JSON request, send JSON
    if (req.accepts("json") &&!req.accepts("html")) {
        return res.status(404).json({
            success: false,
            message: "Route not found"
        });
    }

    return res.status(404).render("error/404", {
        title: "404 - Page Not Found",
        user: req.user || null,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// ==========================================================
// GLOBAL ERROR HANDLER - PERFECT
// ==========================================================

app.use((err, req, res, next) => {
    console.error("❌ Unhandled error:", err);

    let statusCode = Number(err.statusCode || err.status || 500);

    // Multer file too large
    if (err && err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
        statusCode = 400;
        err.message = "The uploaded image is too large. Maximum size is 5MB.";
    }

    // Ensure valid status code
    if (statusCode < 400 || statusCode > 599) {
        statusCode = 500;
    }

    // JSON response for API
    if (!req.accepts("html") || req.xhr || req.path.startsWith("/api")) {
        return res.status(statusCode).json({
            success: false,
            message:
                isProduction && statusCode === 500
                   ? "Internal Server Error"
                    : err.message || "Something went wrong"
        });
    }

    // HTML response
    const errorViews = {
        400: "error/400",
        401: "error/401",
        403: "error/403",
        404: "error/404",
        409: "error/409",
        422: "error/422",
        429: "error/429",
        500: "error/500"
    };

    const view = errorViews[statusCode] || "error/500";

    return res.status(statusCode).render(view, {
        title: `${statusCode} Error`,
        error: err.message || "Internal Server Error",
        statusCode: statusCode,
        user: req.user || null
    });
});

// ==========================================================
// PORT
// ==========================================================

const PORT = Number(process.env.PORT || 3000);

// ==========================================================
// START SERVER
// ==========================================================

const startServer = (port) => {
    server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });
};

// ==========================================================
// SERVER ERROR
// ==========================================================

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(
            `❌ Port ${PORT} is already in use. Free it or set a different port in the environment.`
        );
        process.exit(1);
    }
    console.error("❌ Server error:", error.message);
    process.exit(1);
});

// ==========================================================
// GRACEFUL SHUTDOWN
// ==========================================================

process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM. Shutting down gracefully...");
    server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT. Shutting down gracefully...");
    server.close(() => process.exit(0));
});

// ==========================================================
// DATABASE BOOTSTRAP
// ==========================================================

const bootstrap = async () => {
    try {
        const dbConnected = await connectDB();

        if (dbConnected) {
            console.log("✅ MongoDB connected.");
        } else if (isProduction) {
            console.error("❌ Production startup failed: MongoDB is unavailable.");
            process.exit(1);
        } else {
            console.warn(
                "⚠️ MongoDB is unavailable. Starting server without database initialization."
            );
        }

        if (dbConnected) {
            console.log("\n🌱 Checking default admin user...");
            await seedUser();
            console.log("✅ Default admin user check completed.");
        }

        startServer(PORT);
    } catch (error) {
        console.error("\n❌ Application bootstrap failed:");
        console.error(error);

        if (isProduction) {
            console.error("\n🛑 Server startup aborted.");
            process.exit(1);
        }

        console.warn(
            "\n⚠️ Database initialization failed. Starting server in development mode."
        );
        startServer(PORT);
    }
};

// ==========================================================
// START APPLICATION
// ==========================================================

bootstrap();