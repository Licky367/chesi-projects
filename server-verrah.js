// ==========================================================
// server-cov1.js - VERRAH COSMETICS
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
// PROCESS / CRASH LOGGING
// ==========================================================

process.on("uncaughtException", (err) => {

    console.error(
        "❌ UNCAUGHT EXCEPTION:",
        err.message
    );

    console.error(
        err.stack
    );

    setTimeout(
        () => process.exit(1),
        1000
    );
});


process.on("unhandledRejection", (reason) => {

    console.error(
        "❌ UNHANDLED REJECTION:",
        reason?.message || reason
    );

    console.error(
        reason?.stack || reason
    );
});


console.log(
    "=========================================================="
);

console.log(
    "🚀 Starting VERRAH server"
);

console.log(
    "=========================================================="
);


// ==========================================================
// ENVIRONMENT
// ==========================================================

const isProduction =
    process.env.NODE_ENV === "production";


const PORT =
    Number(
        process.env.PORT || 3000
    );


const SESSION_MAX_AGE =
    10 *
    365 *
    24 *
    60 *
    60 *
    1000;


const SESSION_TTL =
    Math.floor(
        SESSION_MAX_AGE / 1000
    );


// ==========================================================
// PRODUCTION ENVIRONMENT VALIDATION
// ==========================================================

if (isProduction) {

    const requiredEnvironment = [
        "MONGO_URI",
        "SESSION_SECRET",
        "FRONTEND_URL"
    ];


    const missingEnvironment =
        requiredEnvironment.filter(
            (key) => !process.env[key]
        );


    if (missingEnvironment.length) {

        console.error(
            `❌ Missing environment variables: ${missingEnvironment.join(", ")}`
        );

        process.exit(1);
    }
}


// ==========================================================
// CONNECT-MONGO
// ==========================================================

let MongoStore = null;


try {

    MongoStore =
        require("connect-mongo");

    console.log(
        "✅ connect-mongo loaded"
    );

} catch (error) {

    console.warn(
        "⚠️ connect-mongo unavailable:",
        error.message
    );


    if (isProduction) {

        console.error(
            "❌ connect-mongo is required in production."
        );

        process.exit(1);
    }
}


// ==========================================================
// DATABASE + SEEDER
// ==========================================================

const connectDB =
    require("./db");


const seedUser =
    require("./verrah/utils/seeder");


// ==========================================================
// SESSION DATA MIDDLEWARE
// ==========================================================
//
// Loads:
//
//     req.session.userCart
//     req.session.allCarts
//
// and:
//
//     res.locals.userCart
//     res.locals.allCarts
//
// IMPORTANT:
// This middleware is mounted AFTER the middleware that creates
// req.user, so it can correctly identify the logged-in user.
// ==========================================================

const sessionData =
    require("./verrah/middleware/sessionData");


// ==========================================================
// ROUTE LOADER
// ==========================================================

function safeLoad(
    name,
    routePath
) {

    try {

        console.log(
            `... Loading ${name}: ${routePath}`
        );


        const route =
            require(routePath);


        console.log(
            `✅ Loaded ${name}`
        );


        return route;

    } catch (error) {

        console.error(
            `❌ Failed to load ${name}: ${routePath}`
        );

        console.error(
            error.message
        );

        console.error(
            error.stack
        );


        return null;
    }
}


// ==========================================================
// ROUTES
// ==========================================================


// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------

const authRoutes =
    safeLoad(
        "authRoutes",
        "./verrah/routes/auth"
    );


// ----------------------------------------------------------
// VERRAH
// ----------------------------------------------------------

const verrahRoutes =
    safeLoad(
        "verrahRoutes",
        "./verrah/routes/index"
    );


// ----------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------

const productsRoutes =
    safeLoad(
        "productsRoutes",
        "./verrah/routes/products"
    );


// ----------------------------------------------------------
// CARTS
// ----------------------------------------------------------

const cartsRoutes =
    safeLoad(
        "cartsRoutes",
        "./verrah/routes/carts"
    );


// ----------------------------------------------------------
// STOCK
// ----------------------------------------------------------

const stockRoutes =
    safeLoad(
        "stockRoutes",
        "./verrah/routes/stock"
    );


// ----------------------------------------------------------
// SUBSTATIONS
// ----------------------------------------------------------

const substationsRoutes =
    safeLoad(
        "substationsRoutes",
        "./verrah/routes/substations"
    );


// ----------------------------------------------------------
// PACKAGES
// ----------------------------------------------------------

const packageRoutes =
    safeLoad(
        "packageRoutes",
        "./verrah/routes/packages"
    );


// ----------------------------------------------------------
// MPESA
// ----------------------------------------------------------

const mpesaRoutes =
    safeLoad(
        "mpesaRoutes",
        "./verrah/routes/mpesa"
    );


// ----------------------------------------------------------
// SALES
// ----------------------------------------------------------

const salesRoutes =
    safeLoad(
        "salesRoutes",
        "./verrah/routes/sales"
    );


// ----------------------------------------------------------
// BRANCHES
// ----------------------------------------------------------

const branchRoutes =
    safeLoad(
        "branchRoutes",
        "./verrah/routes/branch"
    );


// ----------------------------------------------------------
// PROFILE
// ----------------------------------------------------------

const profileRoutes =
    safeLoad(
        "profileRoutes",
        "./verrah/routes/profile"
    );


// ----------------------------------------------------------
// LIABILITIES 
// ----------------------------------------------------------

const liabilityRoutes =
    safeLoad(
        "liabilityRoutes",
        "./verrah/routes/liability"
    );



// ==========================================================
// SOCKET.IO
// ==========================================================

const socketHandler =
    require("./socket/socket");


// ==========================================================
// APPLICATION
// ==========================================================

const app =
    express();


const server =
    http.createServer(
        app
    );


app.disable(
    "x-powered-by"
);


// ==========================================================
// TRUST PROXY
// ==========================================================

if (
    isProduction ||
    process.env.TRUST_PROXY === "1"
) {

    app.enable(
        "trust proxy"
    );
}


// ==========================================================
// SECURITY
// ==========================================================

app.use(
    helmet({

        contentSecurityPolicy:
            false,

        crossOriginEmbedderPolicy:
            false
    })
);


// ==========================================================
// RATE LIMITING
// ==========================================================

app.use(
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        max:
            isProduction
                ? 200
                : 1000,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Too many requests. Please try again later."
        }
    })
);


// ==========================================================
// PERFORMANCE / LOGGING
// ==========================================================

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
    new Server(
        server,
        {

            cors: {

                origin:
                    allowedOrigin,

                methods:
                    [
                        "GET",
                        "POST"
                    ]
            }
        }
    );


app.set(
    "io",
    io
);


socketHandler(
    io
);


// ==========================================================
// BODY PARSERS
// ==========================================================

app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            "10mb"
    })
);


app.use(
    express.json({

        limit:
            "10mb"
    })
);


// ==========================================================
// METHOD OVERRIDE
// ==========================================================

app.use(
    methodOverride(
        "_method"
    )
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
                SESSION_TTL,

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

        resave:
            false,

        saveUninitialized:
            false,

        rolling:
            true,

        cookie: {

            httpOnly:
                true,

            secure:
                isProduction,

            sameSite:
                "lax",

            maxAge:
                SESSION_MAX_AGE
        }
    })
);


// ==========================================================
// REQUEST / USER CONTEXT
// ==========================================================
//
// Creates:
//
//     req.user
//
//     res.locals.user
//
//     res.locals.req
//
//     res.locals.currentPath
//
// This MUST happen before sessionData middleware.
// ==========================================================

app.use(
    (req, res, next) => {

        const currentUser =
            req.session?.user ||
            null;


        res.locals.user =
            currentUser;


        res.locals.req =
            req;


        res.locals.currentPath =
            req.path;


        req.user =
            currentUser;


        next();
    }
);


// ==========================================================
// SESSION DATA
// ==========================================================
//
// IMPORTANT:
//
// This is intentionally AFTER:
//
//     express-session
//             ↓
//     user context
//
// and BEFORE:
//
//     routes
//
// Therefore every route/view can access:
//
//     req.session.userCart
//     req.session.allCarts
//
//     res.locals.userCart
//     res.locals.allCarts
//
// The sidebar can therefore safely use:
//
//     userCart
//
// ==========================================================

app.use(
    sessionData
);


console.log(
    "✅ Session data middleware mounted"
);


// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get(
    "/health",
    (req, res) => {

        return res.json({

            success:
                true,

            status:
                "ok"
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
            "public",
            "uploads"
        )
    )
);


// ==========================================================
// EJS VIEW ENGINE
// ==========================================================

const viewsPath =
    path.join(
        __dirname,
        "verrah",
        "views"
    );


app.set(
    "view engine",
    "ejs"
);


app.set(
    "views",
    viewsPath
);


// ==========================================================
// EXPRESS EJS LAYOUTS
// ==========================================================

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

console.log(
    "=========================================================="
);


console.log(
    "📡 Mounting VERRAH routes"
);


console.log(
    "=========================================================="
);


// ==========================================================
// AUTH
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
        "❌ /auth was not mounted"
    );
}


// ==========================================================
// PRODUCTS
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
        "❌ /products was not mounted"
    );
}


// ==========================================================
// CARTS
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
        "❌ /carts was not mounted"
    );
}


// ==========================================================
// STOCK
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
        "❌ /stock was not mounted"
    );
}


// ==========================================================
// SUBSTATIONS
// ==========================================================

if (substationsRoutes) {

    app.use(
        "/substations",
        substationsRoutes
    );


    console.log(
        "✅ Mounted /substations"
    );

} else {

    console.error(
        "❌ /substations was not mounted"
    );
}


// ==========================================================
// PACKAGES
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
        "❌ /packages was not mounted"
    );
}


// ==========================================================
// MPESA
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
        "❌ /mpesa was not mounted"
    );
}


// ==========================================================
// VERRAH MAIN
// ==========================================================

if (verrahRoutes) {

    app.use(
        "/",
        verrahRoutes
    );


    console.log(
        "✅ Mounted /"
    );

} else {

    console.error(
        "❌ / was not mounted"
    );
}


// ==========================================================
// BRANCHES
// ==========================================================

if (branchRoutes) {

    app.use(
        "/branch",
        branchRoutes
    );


    console.log(
        "✅ Mounted /branch"
    );

} else {

    console.error(
        "❌ /branch was not mounted"
    );
}


// ==========================================================
// SALES
// ==========================================================

if (salesRoutes) {

    app.use(
        "/sales",
        salesRoutes
    );


    console.log(
        "✅ Mounted /sales"
    );

} else {

    console.error(
        "❌ /sales was not mounted"
    );
}


// ==========================================================
// PROFILE
// ==========================================================

if (profileRoutes) {

    app.use(
        "/profile",
        profileRoutes
    );


    console.log(
        "✅ Mounted /profile"
    );

} else {

    console.error(
        "❌ /profile was not mounted"
    );
}

// ==========================================================
// LIABILITIES 
// ==========================================================

if (liabilityRoutes) {

    app.use(
        "/profile",
        liabilityRoutes
    );


    console.log(
        "✅ Mounted /liability"
    );

} else {

    console.error(
        "❌ /liability was not mounted"
    );
}


// ==========================================================
// 404 HANDLER
// ==========================================================

app.use(
    (req, res) => {

        const wantsJson =
            req.accepts("json") &&
            !req.accepts("html");


        if (wantsJson) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        "Route not found"
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
                        req.user ||
                        null,

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
            "❌ Unhandled application error:",
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


        // ------------------------------------------------------
        // MULTER FILE-SIZE ERROR
        // ------------------------------------------------------

        if (
            err.name === "MulterError" &&
            err.code === "LIMIT_FILE_SIZE"
        ) {

            statusCode =
                400;


            err.message =
                "The uploaded image is too large. Maximum size is 5MB.";
        }


        // ------------------------------------------------------
        // NORMALIZE INVALID STATUS CODES
        // ------------------------------------------------------

        if (
            statusCode < 400 ||
            statusCode > 599
        ) {

            statusCode =
                500;
        }


        // ------------------------------------------------------
        // JSON / API RESPONSE
        // ------------------------------------------------------

        if (
            !req.accepts("html") ||
            req.xhr ||
            req.path.startsWith("/api")
        ) {

            return res
                .status(statusCode)
                .json({

                    success:
                        false,

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


        // ------------------------------------------------------
        // HTML ERROR VIEWS
        // ------------------------------------------------------

        const errorViews = {

            400:
                "error/400",

            401:
                "error/401",

            403:
                "error/403",

            404:
                "error/404",

            409:
                "error/409",

            422:
                "error/422",

            429:
                "error/429",

            500:
                "error/500"
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
                        isProduction &&
                        statusCode === 500

                            ? "Internal Server Error"

                            : (
                                err.message ||
                                "Something went wrong"
                            ),

                    statusCode,

                    user:
                        req.user ||
                        null
                }
            );
    }
);


// ==========================================================
// SERVER ERROR HANDLER
// ==========================================================

server.on(
    "error",
    (error) => {

        console.error(
            "❌ HTTP server error:",
            error.message
        );


        console.error(
            error.stack
        );


        process.exit(1);
    }
);


// ==========================================================
// START SERVER
// ==========================================================

function startServer(port) {

    server.listen(
        port,
        () => {

            console.log(
                "=========================================================="
            );


            console.log(
                `🚀 VERRAH COSMETICS running on port ${port}`
            );


            console.log(
                `🌍 Environment: ${process.env.NODE_ENV || "development"}`
            );


            console.log(
                "=========================================================="
            );
        }
    );
}


// ==========================================================
// DATABASE BOOTSTRAP
// ==========================================================

async function bootstrap() {

    try {

        console.log(
            "=========================================================="
        );


        console.log(
            "🔌 Connecting to MongoDB"
        );


        console.log(
            "=========================================================="
        );


        const dbConnected =
            await connectDB();


        if (dbConnected) {

            console.log(
                "✅ MongoDB connected"
            );


            await seedUser();


            console.log(
                "✅ User seed completed"
            );

        } else {

            console.warn(
                "⚠️ Database connection was not established"
            );
        }


        startServer(
            PORT
        );

    } catch (error) {

        console.error(
            "❌ Bootstrap failed:",
            error.message
        );


        console.error(
            error.stack
        );


        if (isProduction) {

            console.error(
                "❌ Production server will not start."
            );


            process.exit(1);
        }


        console.warn(
            "⚠️ Development mode: starting server without confirmed DB connection."
        );


        startServer(
            PORT
        );
    }
}


// ==========================================================
// START
// ==========================================================

bootstrap();