// ==========================================================
// server.js
// ==========================================================
//
// APPLICATION ENTRY POINT
//
// Responsibilities:
//
//     - Load environment
//     - Connect MongoDB
//     - Seed default admin
//     - Configure Express
//     - Configure sessions
//     - Configure Socket.IO
//     - Mount application routes
//     - Serve static files
//     - Handle 404 / errors
//     - Start HTTP server
//
// IMPORTANT USER / DAIRY ARCHITECTURE
// ----------------------------------------------------------
//
// User.assignedFarm
//     = Dairy Farm documents assigned to a dairyWorker.
//
// User.assignedAsset
//     = code-less Dairy assets assigned to a user.
//
// Assigned Asset eligibility:
//
//     Dairy.code === null
//     Dairy.assetCode === null
//     Dairy.recordType === "structure"
//
// Farm ownership remains represented by:
//
//     Dairy.assetCode = negative Dairy Farm code
//
// This server does NOT implement assignment logic itself.
// Assignment and retrieval belong to their respective
// controllers/services/routes.
//
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

let MongoStore = null;

try {

    MongoStore = require("connect-mongo");

} catch (error) {

    console.warn(
        "⚠️ connect-mongo is not installed; falling back to default session storage."
    );

}


// ==========================================================
// ENVIRONMENT
// ==========================================================

const isProduction =
    process.env.NODE_ENV === "production";


if (isProduction) {

    const requiredEnvVars = [

        "MONGO_URI",
        "SESSION_SECRET",
        "FRONTEND_URL"

    ];


    const missing =
        requiredEnvVars.filter(
            key => !process.env[key]
        );


    if (missing.length > 0) {

        console.error(
            "❌ Production startup failed. " +
            "Missing required environment variables: " +
            missing.join(", ")
        );

        process.exit(1);

    }

}


// ==========================================================
// DATABASE
// ==========================================================

const connectDB =
    require("./db");


// ==========================================================
// DEFAULT ADMIN USER SEEDER
// ==========================================================

const seedUser =
    require("./utils/seedUser");


// ==========================================================
// ROUTE LOADER
// ==========================================================
//
// Route loading is centralized here.
//
// A missing optional route module does not prevent the rest
// of the application from starting.
//
// ==========================================================

function loadRoute(
    routePath,
    routeName
) {

    try {

        return require(routePath);

    } catch (error) {

        console.warn(
            `⚠️ Failed to load ${routeName} routes:`,
            error.message
        );

        return null;

    }

}


// ==========================================================
// APPLICATION ROUTES
// ==========================================================


// ----------------------------------------------------------
// INDEX
// ----------------------------------------------------------

const indexRoutes =
    loadRoute(
        "./routes/index",
        "index"
    );


// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------

const authRoutes =
    loadRoute(
        "./routes/auth",
        "auth"
    );


// ----------------------------------------------------------
// CREATE INVITE
// ----------------------------------------------------------

const createRoutes =
    loadRoute(
        "./routes/create",
        "create"
    );


// ----------------------------------------------------------
// EXTRA / ASSIGNED ASSETS
// ----------------------------------------------------------
//
// Handles the new assignedAsset system.
//
// User:
//
//     assignedAsset[]
//
// references:
//
//     Dairy._id
//
// for code-less standalone assets.
//
// ----------------------------------------------------------

const extrasRoutes =
    loadRoute(
        "./routes/extras",
        "extras"
    );


// ----------------------------------------------------------
// UPDATE
// ----------------------------------------------------------

const updateRoutes =
    loadRoute(
        "./routes/update",
        "update"
    );


// ----------------------------------------------------------
// ADD DAIRY / ASSET
// ----------------------------------------------------------

const addRoutes =
    loadRoute(
        "./routes/add",
        "add"
    );


// ----------------------------------------------------------
// PROFILE
// ----------------------------------------------------------

const profileRoutes =
    loadRoute(
        "./routes/profile",
        "profile"
    );


// ----------------------------------------------------------
// MILK
// ----------------------------------------------------------

const milkRoutes =
    loadRoute(
        "./routes/milk",
        "milk"
    );


// ----------------------------------------------------------
// MILK SALES
// ----------------------------------------------------------

const milkSalesRoutes =
    loadRoute(
        "./routes/milkSales",
        "milkSales"
    );


// ----------------------------------------------------------
// ACCOUNTS
// ----------------------------------------------------------

const accountsRoutes =
    loadRoute(
        "./routes/accounts",
        "accounts"
    );


// ----------------------------------------------------------
// NET WORTH
// ----------------------------------------------------------

const networthRoutes =
    loadRoute(
        "./routes/networth",
        "networth"
    );


// ----------------------------------------------------------
// FINANCIALS
// ----------------------------------------------------------

const financialsRoutes =
    loadRoute(
        "./routes/financials",
        "financials"
    );


// ----------------------------------------------------------
// STORAGE
// ----------------------------------------------------------

const storageRoutes =
    loadRoute(
        "./routes/storage",
        "storage"
    );


// ----------------------------------------------------------
// POULTRY STATS
// ----------------------------------------------------------

const poultryStatsRoutes =
    loadRoute(
        "./routes/poultryStats",
        "poultryStats"
    );


// ----------------------------------------------------------
// EGGS
// ----------------------------------------------------------

const eggRoutes =
    loadRoute(
        "./routes/poultryEgg",
        "poultryEgg"
    );


// ----------------------------------------------------------
// CAGE
// ----------------------------------------------------------

const cageRoutes =
    loadRoute(
        "./routes/poultryCage",
        "poultryCage"
    );


// ----------------------------------------------------------
// NURSING
// ----------------------------------------------------------

const nursingRoutes =
    loadRoute(
        "./routes/poultryNursing",
        "poultryNursing"
    );


// ----------------------------------------------------------
// POULTRY FINANCE
// ----------------------------------------------------------

const financeRoutes =
    loadRoute(
        "./routes/poultryFinance",
        "poultryFinance"
    );


// ----------------------------------------------------------
// INCUBATION
// ----------------------------------------------------------

const incubationRoutes =
    loadRoute(
        "./routes/poultryIncubation",
        "poultryIncubation"
    );


// ----------------------------------------------------------
// DASHBOARD
// ----------------------------------------------------------

const dashboardRoutes =
    loadRoute(
        "./routes/dashboard",
        "dashboard"
    );


// ----------------------------------------------------------
// AGRICULTURE
// ----------------------------------------------------------

const farmRoutes =
    loadRoute(
        "./routes/farm",
        "farm"
    );


// ==========================================================
// SOCKET HANDLER
// ==========================================================

const socketHandler =
    require("./socket/socket");


// ==========================================================
// EXPRESS APPLICATION
// ==========================================================

const app =
    express();


const server =
    http.createServer(app);


app.disable("x-powered-by");


// ==========================================================
// TRUST PROXY
// ==========================================================

if (
    isProduction ||
    process.env.TRUST_PROXY === "1"
) {

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
// GLOBAL RATE LIMIT
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

            message:
                "Too many requests, please try again later."

        }

    })

);


// ==========================================================
// COMPRESSION
// ==========================================================

app.use(
    compression()
);


// ==========================================================
// HTTP LOGGING
// ==========================================================

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

                methods: [
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

app.use(
    methodOverride("_method")
);


// ==========================================================
// SESSION STORE
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


// ==========================================================
// SESSION
// ==========================================================

app.use(

    session({

        secret:

            process.env.SESSION_SECRET ||

            (
                isProduction
                    ? ""
                    : "development-session-secret"
            ),

        store:
            sessionStore,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            secure:
                isProduction,

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24

        }

    })

);


// ==========================================================
// GLOBAL REQUEST USER
// ==========================================================
//
// req.session.user remains the authentication source.
//
// req.user and res.locals.user provide convenient access
// throughout controllers and EJS views.
//
// assignedFarm and assignedAsset remain properties of the
// authenticated User document/session.
//
// ==========================================================

app.use(

    (req, res, next) => {

        const currentUser =
            req.session?.user ||
            null;


        req.user =
            currentUser;


        res.locals.user =
            currentUser;


        res.locals.req =
            req;


        res.locals.currentPath =
            req.path;


        next();

    }

);


// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get(

    "/health",

    (req, res) => {

        return res.status(200).json({

            status: "ok",

            environment:
                process.env.NODE_ENV ||
                "development"

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


// ==========================================================
// UPLOADS
// ==========================================================

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

app.set(
    "view engine",
    "ejs"
);


app.set(

    "views",

    path.join(
        __dirname,
        "views"
    )

);


app.use(
    expressLayouts
);


app.set(
    "layout",
    "layout"
);


// ==========================================================
// ROUTE MOUNTING
// ==========================================================


// ==========================================================
// INDEX
// ==========================================================

if (indexRoutes) {

    app.use(
        "/",
        indexRoutes
    );

}


// ==========================================================
// AUTH
// ==========================================================

if (authRoutes) {

    app.use(
        "/",
        authRoutes
    );

}


// ==========================================================
// CREATE INVITE
// ==========================================================

if (createRoutes) {

    app.use(
        "/create-invite",
        createRoutes
    );

}


// ==========================================================
// EXTRA / ASSIGNED ASSETS
// ==========================================================
//
// The extras router owns the assignedAsset UI/API.
//
// Example architecture:
//
//     routes/extrasRoutes.js
//
// The router itself defines the exact endpoints.
//
// Mounting at "/" preserves the route definitions inside
// extrasRoutes and avoids duplicating route prefixes here.
//
// ==========================================================

if (extrasRoutes) {

    app.use(
        "/",
        extrasRoutes
    );

}


// ==========================================================
// UPDATE
// ==========================================================

if (updateRoutes) {

    app.use(
        "/",
        updateRoutes
    );

}


// ==========================================================
// ADD DAIRY / ASSET
// ==========================================================

if (addRoutes) {

    app.use(
        "/add",
        addRoutes
    );

}


// ==========================================================
// PROFILE
// ==========================================================

if (profileRoutes) {

    app.use(
        "/",
        profileRoutes
    );

}


// ==========================================================
// MILK
// ==========================================================

if (milkRoutes) {

    app.use(
        "/",
        milkRoutes
    );

}


// ==========================================================
// MILK SALES
// ==========================================================

if (milkSalesRoutes) {

    app.use(
        "/milk",
        milkSalesRoutes
    );

}


// ==========================================================
// ACCOUNTS
// ==========================================================

if (accountsRoutes) {

    app.use(
        "/accounts",
        accountsRoutes
    );

}


// ==========================================================
// NET WORTH
// ==========================================================

if (networthRoutes) {

    app.use(
        "/networth",
        networthRoutes
    );

}


// ==========================================================
// FINANCIALS
// ==========================================================

if (financialsRoutes) {

    app.use(
        "/financials",
        financialsRoutes
    );

}


// ==========================================================
// STORAGE
// ==========================================================

if (storageRoutes) {

    app.use(
        "/storage",
        storageRoutes
    );

}


// ==========================================================
// POULTRY STATS
// ==========================================================

if (poultryStatsRoutes) {

    app.use(
        "/poultry-stats",
        poultryStatsRoutes
    );

}


// ==========================================================
// EGGS
// ==========================================================

if (eggRoutes) {

    app.use(
        "/eggs",
        eggRoutes
    );

}


// ==========================================================
// CAGE
// ==========================================================

if (cageRoutes) {

    app.use(
        "/cage",
        cageRoutes
    );

}


// ==========================================================
// NURSING
// ==========================================================

if (nursingRoutes) {

    app.use(
        "/nursing",
        nursingRoutes
    );

}


// ==========================================================
// INCUBATION
// ==========================================================

if (incubationRoutes) {

    app.use(
        "/incubation",
        incubationRoutes
    );

}


// ==========================================================
// POULTRY FINANCE
// ==========================================================

if (financeRoutes) {

    app.use(
        "/finance",
        financeRoutes
    );

}


// ==========================================================
// DASHBOARD
// ==========================================================

if (dashboardRoutes) {

    app.use(
        "/dashboard",
        dashboardRoutes
    );

}


// ==========================================================
// AGRICULTURE
// ==========================================================

if (farmRoutes) {

    app.use(
        "/farm",
        farmRoutes
    );

}


// ==========================================================
// 404 HANDLER
// ==========================================================

app.use(

    (req, res) => {

        return res.status(404).render(

            "404",

            {

                title:
                    "404 - Page Not Found",

                user:
                    req.user ||
                    null

            }

        );

    }

);


// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use(

    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "❌ Unhandled error:",
            err
        );


        let statusCode =
            Number(

                err.statusCode ||
                err.status ||
                500

            );


        // --------------------------------------------------
        // MULTER FILE SIZE
        // --------------------------------------------------

        if (

            err &&
            err.name === "MulterError" &&
            err.code === "LIMIT_FILE_SIZE"

        ) {

            statusCode = 400;

            err.message =
                "The uploaded image is too large. Maximum size is 5MB.";

        }


        // --------------------------------------------------
        // HTML RESPONSE
        // --------------------------------------------------

        if (
            req.accepts("html")
        ) {

            const views = {

                400: "400",
                401: "401",
                403: "403",
                404: "404",
                409: "409",
                422: "422",
                500: "500"

            };


            const view =
                views[statusCode] ||
                "500";


            return res.status(
                statusCode
            ).render(

                view,

                {

                    title:
                        `${statusCode} Error`,

                    error:
                        err.message,

                    user:
                        req.user ||
                        null

                }

            );

        }


        // --------------------------------------------------
        // JSON RESPONSE
        // --------------------------------------------------

        return res.status(
            statusCode
        ).json({

            success: false,

            message:

                isProduction &&
                statusCode === 500

                    ? "Internal Server Error"

                    : err.message

        });

    }

);


// ==========================================================
// PORT
// ==========================================================

const PORT =
    Number(
        process.env.PORT ||
        3000
    );


// ==========================================================
// START SERVER
// ==========================================================

function startServer(port) {

    server.listen(

        port,

        () => {

            console.log(
                `🚀 Server running on port ${port}`
            );

        }

    );

}


// ==========================================================
// SERVER ERROR
// ==========================================================

server.on(

    "error",

    error => {

        if (
            error.code === "EADDRINUSE"
        ) {

            console.error(
                `❌ Port ${PORT} is already in use. ` +
                "Free it or set a different PORT."
            );

            process.exit(1);

        }


        console.error(
            "❌ Server error:",
            error.message
        );


        process.exit(1);

    }

);


// ==========================================================
// GRACEFUL SHUTDOWN
// ==========================================================

function gracefulShutdown(signal) {

    console.log(
        `🛑 Received ${signal}. Shutting down gracefully...`
    );


    server.close(
        () => {

            console.log(
                "✅ HTTP server closed."
            );

            process.exit(0);

        }
    );

}


process.on(
    "SIGTERM",
    () => gracefulShutdown("SIGTERM")
);


process.on(
    "SIGINT",
    () => gracefulShutdown("SIGINT")
);


// ==========================================================
// DATABASE BOOTSTRAP
// ==========================================================

async function bootstrap() {

    try {

        // --------------------------------------------------
        // DATABASE
        // --------------------------------------------------

        const dbConnected =
            await connectDB();


        if (dbConnected) {

            console.log(
                "✅ MongoDB connected."
            );

        }


        else if (isProduction) {

            console.error(
                "❌ Production startup failed: MongoDB is unavailable."
            );

            process.exit(1);

        }


        else {

            console.warn(
                "⚠️ MongoDB is unavailable. " +
                "Starting server without database initialization."
            );

        }


        // --------------------------------------------------
        // DEFAULT ADMIN
        // --------------------------------------------------

        if (dbConnected) {

            console.log(
                "\n🌱 Checking default admin user..."
            );


            await seedUser();


            console.log(
                "✅ Default admin user check completed."
            );

        }


        // --------------------------------------------------
        // START HTTP SERVER
        // --------------------------------------------------

        startServer(PORT);

    } catch (error) {

        console.error(
            "\n❌ Application bootstrap failed:"
        );


        console.error(
            error
        );


        if (isProduction) {

            console.error(
                "\n🛑 Server startup aborted."
            );

            process.exit(1);

        }


        console.warn(
            "\n⚠️ Database initialization failed. " +
            "Starting server in development mode."
        );


        startServer(PORT);

    }

}


// ==========================================================
// START APPLICATION
// ==========================================================

bootstrap();