// ==========================================================
// server-corevester.js
// COREVESTER
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
// CRASH LOGGING
// ==========================================================

process.on("uncaughtException", (err) => {
    console.error("❌ UNCAUGHT EXCEPTION:", err.message);
    console.error(err.stack);

    setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (reason) => {
    console.error(
        "❌ UNHANDLED REJECTION:",
        reason?.message || reason
    );

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
    console.warn(
        "⚠️ connect-mongo not installed:",
        error.message
    );
}


// ==========================================================
// ENVIRONMENT
// ==========================================================

const isProduction =
    process.env.NODE_ENV === "production";


if (isProduction) {

    const required = [
        "MONGO_URI",
        "SESSION_SECRET",
        "FRONTEND_URL"
    ];

    const missing =
        required.filter(
            key => !process.env[key]
        );

    if (missing.length) {

        console.error(
            `❌ Missing env: ${missing.join(", ")}`
        );

        process.exit(1);
    }
}


// ==========================================================
// DATABASE + SEED
// ==========================================================

const connectDB =
    require("./db");

const seedUser =
    require("./utils/seedUser");


// ==========================================================
// SAFE ROUTE LOADER
// ==========================================================

function safeLoad(name, pathToRequire) {

    try {

        console.log(
            `... Loading ${name}: ${pathToRequire}`
        );

        const mod =
            require(pathToRequire);

        console.log(
            `✅ Loaded ${name}`
        );

        return mod;

    } catch (err) {

        console.error(
            `❌ FAILED to load ${name}: ${pathToRequire}`
        );

        console.error(err.message);
        console.error(err.stack);

        return null;
    }
}


// ==========================================================
// ROUTES
// ==========================================================
//
// IMPORTANT PATH CONTRACT:
//
// Auth:
//     /routes/auth.js
//
// CoreVester:
//     /routes/index.js
//
// Shop:
//     /routes/products.js
//     /routes/carts.js
//     /routes/stock.js
//     /routes/packages.js
//     /routes/mpesa.js
//
// ==========================================================


// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------

const authRoutes =
    safeLoad(
        "authRoutes",
        "./routes/auth"
    );


// ----------------------------------------------------------
// COREVERSTER MAIN ROUTES
// ----------------------------------------------------------

const corevesterRoutes =
    safeLoad(
        "corevesterRoutes",
        "./routes/index"
    );


// ----------------------------------------------------------
// SHOP ROUTES
// ----------------------------------------------------------

const productsRoutes =
    safeLoad(
        "productsRoutes",
        "./routes/products"
    );

const cartsRoutes =
    safeLoad(
        "cartsRoutes",
        "./routes/carts"
    );

const stockRoutes =
    safeLoad(
        "stockRoutes",
        "./routes/stock"
    );

const packageRoutes =
    safeLoad(
        "packageRoutes",
        "./routes/packages"
    );

const mpesaRoutes =
    safeLoad(
        "mpesaRoutes",
        "./routes/mpesa"
    );


// ==========================================================
// SOCKET HANDLER
// ==========================================================

const socketHandler =
    require("./socket/socket");


// ==========================================================
// APP
// ==========================================================

const app =
    express();

const server =
    http.createServer(app);


app.disable("x-powered-by");


if (
    isProduction ||
    process.env.TRUST_PROXY === "1"
) {
    app.enable("trust proxy");
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


app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,

        max:
            isProduction
                ? 200
                : 1000,

        standardHeaders: true,
        legacyHeaders: false,

        message: {
            message: "Too many requests"
        }
    })
);


app.use(
    compression()
);


app.use(
    morgan(
        process.env.MORGAN_FORMAT ||
        "combined"
    )
);


// ==========================================================
// SOCKET.IO
// ==========================================================

const allowedOrigin =
    process.env.FRONTEND_URL ||
    (
        isProduction
            ? false
            : "*"
    );


const io =
    new Server(server, {
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


app.use(
    methodOverride("_method")
);


// ==========================================================
// SESSION
// ==========================================================

const sessionStore =
    isProduction &&
    process.env.MONGO_URI &&
    MongoStore
        ? MongoStore.create({
            mongoUrl:
                process.env.MONGO_URI,

            ttl:
                24 * 60 * 60,

            touchAfter:
                60 * 60
        })
        : undefined;


app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "development-session-secret",

        store:
            sessionStore,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure:
                isProduction,

            sameSite: "lax",

            maxAge:
                86400000
        }
    })
);


// ==========================================================
// REQUEST / USER CONTEXT
// ==========================================================

app.use((req, res, next) => {

    res.locals.user =
        req.session?.user ||
        null;

    res.locals.req =
        req;

    res.locals.currentPath =
        req.path;

    req.user =
        res.locals.user;

    next();
});


// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get(
    "/health",
    (req, res) => {

        res.json({
            status: "ok"
        });
    }
);


// ==========================================================
// STATIC FILES
// ==========================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "public/uploads"
        )
    )
);


// ==========================================================
// VIEW ENGINE
// ==========================================================
//
// COREVERSTER VIEW DIRECTORY:
//
//     /corevester/views
//
// Therefore:
//
//     __dirname/corevester/views
//
// ==========================================================

app.set(
    "view engine",
    "ejs"
);


const viewsPath =
    path.join(
        __dirname,
        "corevester",
        "views"
    );


app.set(
    "views",
    viewsPath
);


app.use(
    expressLayouts
);


app.set(
    "layout",
    "layout"
);


app.set(
    "layout extractScripts",
    true
);


app.set(
    "layout extractStyles",
    true
);


console.log(
    "✅ Views:",
    viewsPath
);

console.log(
    "✅ Layout: layout"
);


// ==========================================================
// ROUTE MOUNTING
// ==========================================================
//
// ORDER IS IMPORTANT.
//
// Specific shop routes are mounted BEFORE the "/" router.
//
// This prevents routes/index.js from accidentally catching:
//
//     /products
//     /carts
//     /stock
//     /packages
//     /mpesa
//
// Auth is also mounted independently at /auth.
//
// ==========================================================

console.log(
    "--- Mounting routes ---"
);


// ==========================================================
// 1. AUTH
// ==========================================================
//
// File:
//     /routes/auth.js
//
// URL:
//     /auth/*
//
// ==========================================================

if (authRoutes) {

    app.use(
        "/auth",
        authRoutes
    );

    console.log(
        "✅ Mounted /auth"
    );

} else {

    console.error(
        "❌ /auth NOT MOUNTED - route failed to load"
    );
}


// ==========================================================
// 2. PRODUCTS
// ==========================================================
//
// File:
//     /routes/products.js
//
// URLs:
//
//     GET  /products
//     GET  /products/:id
//     POST /products/:id/cart
//
// ==========================================================

if (productsRoutes) {

    app.use(
        "/products",
        productsRoutes
    );

    console.log(
        "✅ Mounted /products"
    );

} else {

    console.error(
        "❌ /products NOT MOUNTED"
    );
}


// ==========================================================
// 3. CARTS
// ==========================================================
//
// File:
//     /routes/carts.js
//
// URLs:
//
//     GET  /carts
//     GET  /carts/:id
//     POST /carts/:id/remove
//     POST /carts/checkout
//     GET  /carts/payment/:id
//     GET  /carts/payment/:id/status
//
// ==========================================================

if (cartsRoutes) {

    app.use(
        "/carts",
        cartsRoutes
    );

    console.log(
        "✅ Mounted /carts"
    );

} else {

    console.error(
        "❌ /carts NOT MOUNTED"
    );
}


// ==========================================================
// 4. STOCK
// ==========================================================
//
// File:
//     /routes/stock.js
//
// URLs:
//
//     GET  /stock
//     GET  /stock/new
//     POST /stock
//     GET  /stock/:id
//     POST /stock/:id
//
// ==========================================================

if (stockRoutes) {

    app.use(
        "/stock",
        stockRoutes
    );

    console.log(
        "✅ Mounted /stock"
    );

} else {

    console.error(
        "❌ /stock NOT MOUNTED"
    );
}


// ==========================================================
// 5. PACKAGES
// ==========================================================
//
// File:
//     /routes/packages.js
//
// URLs:
//
//     GET /packages
//     GET /packages/:id
//
// ==========================================================

if (packageRoutes) {

    app.use(
        "/packages",
        packageRoutes
    );

    console.log(
        "✅ Mounted /packages"
    );

} else {

    console.error(
        "❌ /packages NOT MOUNTED"
    );
}


// ==========================================================
// 6. MPESA CALLBACK
// ==========================================================
//
// File:
//     /routes/mpesa.js
//
// URL:
//
//     POST /mpesa/callback
//
// Safaricom/Daraja calls this endpoint directly.
//
// ==========================================================

if (mpesaRoutes) {

    app.use(
        "/mpesa",
        mpesaRoutes
    );

    console.log(
        "✅ Mounted /mpesa"
    );

} else {

    console.error(
        "❌ /mpesa NOT MOUNTED"
    );
}


// ==========================================================
// 7. COREVERSTER MAIN ROUTES
// ==========================================================
//
// File:
//     /routes/index.js
//
// Mounted at:
//
//     /
//
// IMPORTANT:
// This is deliberately mounted AFTER the specific
// shop routes above.
//
// ==========================================================

if (corevesterRoutes) {

    app.use(
        "/",
        corevesterRoutes
    );

    console.log(
        "✅ Mounted CoreVester /"
    );

} else {

    console.error(
        "❌ CoreVester / NOT MOUNTED"
    );
}


// ==========================================================
// 404
// ==========================================================

app.use(
    (req, res) => {

        if (
            req.accepts("json") &&
            !req.accepts("html")
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message: "Route not found"
                });
        }


        return res
            .status(404)
            .render(
                "error/404",
                {
                    title:
                        "404 - Page Not Found",

                    user:
                        req.user || null,

                    error:
                        `Cannot ${req.method} ${req.originalUrl}`
                }
            );
    }
);


// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Unhandled error:",
            err.message
        );

        console.error(
            err.stack
        );


        let statusCode =
            Number(
                err.statusCode ||
                err.status ||
                500
            );


        if (
            err &&
            err.name === "MulterError" &&
            err.code === "LIMIT_FILE_SIZE"
        ) {

            statusCode = 400;

            err.message =
                "The uploaded image is too large. Maximum size is 5MB.";
        }


        if (
            statusCode < 400 ||
            statusCode > 599
        ) {

            statusCode = 500;
        }


        if (
            !req.accepts("html") ||
            req.xhr ||
            req.path.startsWith("/api")
        ) {

            return res
                .status(statusCode)
                .json({
                    success: false,

                    message:
                        isProduction &&
                        statusCode === 500
                            ? "Internal Server Error"
                            : (
                                err.message ||
                                "Something went wrong"
                            )
                });
        }


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


        const view =
            errorViews[statusCode] ||
            "error/500";


        return res
            .status(statusCode)
            .render(
                view,
                {
                    title:
                        `${statusCode} Error`,

                    error:
                        err.message ||
                        "Internal Server Error",

                    statusCode,

                    user:
                        req.user || null
                }
            );
    }
);


// ==========================================================
// SERVER
// ==========================================================

const PORT =
    Number(
        process.env.PORT ||
        3000
    );


const startServer =
    (port) => {

        server.listen(
            port,
            () => {

                console.log(
                    `🚀 Running on ${port}`
                );
            }
        );
    };


server.on(
    "error",
    (e) => {

        console.error(
            "❌ Server error:",
            e.message,
            e.stack
        );

        process.exit(1);
    }
);


// ==========================================================
// BOOTSTRAP
// ==========================================================

const bootstrap =
    async () => {

        try {

            console.log(
                "--- Connecting DB ---"
            );


            const dbConnected =
                await connectDB();


            if (dbConnected) {

                console.log(
                    "✅ MongoDB connected"
                );


                await seedUser();


                console.log(
                    "✅ Seed done"
                );
            }


            startServer(PORT);

        } catch (error) {

            console.error(
                "❌ Bootstrap failed:",
                error.message
            );

            console.error(
                error.stack
            );


            if (isProduction) {

                process.exit(1);
            }


            startServer(PORT);
        }
    };


bootstrap();