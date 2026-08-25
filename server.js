// ==========================================================
// server.js
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
      (key) => !process.env[key]
    );


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
// ROUTES
// ==========================================================


// ----------------------------------------------------------
// INDEX
// ----------------------------------------------------------

let indexRoutes;

try {

  indexRoutes =
    require("./routes/index");

} catch (err) {

  console.warn(
    "Warning: failed to load index routes:",
    err.message
  );

}


// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------

let authRoutes;

try {

  authRoutes =
    require("./routes/auth");

} catch (err) {

  console.warn(
    "Warning: failed to load auth routes:",
    err.message
  );

}


// ----------------------------------------------------------
// CREATE INVITE
// ----------------------------------------------------------

let createRoutes;

try {

  createRoutes =
    require("./routes/create");

} catch (err) {

  console.warn(
    "Warning: failed to load create routes:",
    err.message
  );

}


// ----------------------------------------------------------
// UPDATE
// ----------------------------------------------------------

let updateRoutes;

try {

  updateRoutes =
    require("./routes/update");

} catch (err) {

  console.warn(
    "Warning: failed to load update routes:",
    err.message
  );

}


// ----------------------------------------------------------
// ADD DAIRY / ASSET
// ----------------------------------------------------------

let addRoutes;

try {

  addRoutes =
    require("./routes/add");

} catch (err) {

  console.warn(
    "Warning: failed to load add routes:",
    err.message
  );

}


// ----------------------------------------------------------
// PROFILE
// ----------------------------------------------------------

let profileRoutes;

try {

  profileRoutes =
    require("./routes/profile");

} catch (err) {

  console.warn(
    "Warning: failed to load profile routes:",
    err.message
  );

}


// ==========================================================
// MILK
// ==========================================================

let milkRoutes;

try {

  milkRoutes =
    require("./routes/milk");

} catch (err) {

  console.warn(
    "Warning: failed to load milk routes:",
    err.message
  );

}


// ==========================================================
// MILK SALES
// ==========================================================

let milkSalesRoutes;

try {

  milkSalesRoutes =
    require("./routes/milkSales");

} catch (err) {

  console.warn(
    "Warning: failed to load milkSales routes:",
    err.message
  );

}


// ----------------------------------------------------------
// ACCOUNTS
// ----------------------------------------------------------

let accountsRoutes;

try {

  accountsRoutes =
    require("./routes/accounts");

} catch (err) {

  console.warn(
    "Warning: failed to load accounts routes:",
    err.message
  );

}


// ==========================================================
// NET WORTH
// ==========================================================

let networthRoutes;

try {

  networthRoutes =
    require("./routes/networth");

} catch (err) {

  console.warn(
    "Warning: failed to load networth routes:",
    err.message
  );

}


// ==========================================================
// FINANCIALS
// ==========================================================

let financialsRoutes;

try {

  financialsRoutes =
    require("./routes/financials");

} catch (err) {

  console.warn(
    "Warning: failed to load financials routes:",
    err.message
  );

}


// ==========================================================
// STORAGE
// ==========================================================

let storageRoutes;

try {

  storageRoutes =
    require("./routes/storage");

} catch (err) {

  console.warn(
    "Warning: failed to load storage routes:",
    err.message
  );

}


// ==========================================================
// POULTRY STATS
// ==========================================================

let poultryStatsRoutes;

try {

  poultryStatsRoutes =
    require("./routes/poultryStats");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryStats routes:",
    err.message
  );

}


// ==========================================================
// EGGS
// ==========================================================

let eggRoutes;

try {

  eggRoutes =
    require("./routes/poultryEgg");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryEgg routes:",
    err.message
  );

}


// ==========================================================
// CAGE
// ==========================================================

let cageRoutes;

try {

  cageRoutes =
    require("./routes/poultryCage");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryCage routes:",
    err.message
  );

}


// ==========================================================
// NURSING
// ==========================================================

let nursingRoutes;

try {

  nursingRoutes =
    require("./routes/poultryNursing");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryNursing routes:",
    err.message
  );

}


// ==========================================================
// FINANCE
// ==========================================================

let financeRoutes;

try {

  financeRoutes =
    require("./routes/poultryFinance");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryFinance routes:",
    err.message
  );

}


// ==========================================================
// INCUBATION
// ==========================================================

let incubationRoutes;

try {

  incubationRoutes =
    require("./routes/poultryIncubation");

} catch (err) {

  console.warn(
    "Warning: failed to load poultryIncubation routes:",
    err.message
  );

}


// ==========================================================
// DASHBOARD
// ==========================================================

let dashboardRoutes;

try {

  dashboardRoutes =
    require("./routes/dashboard");

} catch (err) {

  console.warn(
    "Warning: failed to load dashboard routes:",
    err.message
  );

}


// ==========================================================
// AGRICULTURE
// ==========================================================

let farmRoutes;

try {

  farmRoutes =
    require("./routes/farm");

} catch (err) {

  console.warn(
    "Warning: failed to load farm routes:",
    err.message
  );

}


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
// RATE LIMIT
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
// LOGGING
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
// GLOBAL USER
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

      status:
        "ok",

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


// ----------------------------------------------------------
// INDEX
// ----------------------------------------------------------

if (indexRoutes) {

  app.use(
    "/",
    indexRoutes
  );

}


// ----------------------------------------------------------
// CREATE INVITE
// ----------------------------------------------------------

if (createRoutes) {

  app.use(
    "/create-invite",
    createRoutes
  );

}


// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------

if (authRoutes) {

  app.use(
    "/",
    authRoutes
  );

}


// ----------------------------------------------------------
// UPDATE
// ----------------------------------------------------------

if (updateRoutes) {

  app.use(
    "/",
    updateRoutes
  );

}


// ----------------------------------------------------------
// ADD DAIRY / ASSET
// ----------------------------------------------------------

if (addRoutes) {

  app.use(
    "/add",
    addRoutes
  );

}


// ----------------------------------------------------------
// PROFILE
// ----------------------------------------------------------

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


// ----------------------------------------------------------
// ACCOUNTS
// ----------------------------------------------------------

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
// POULTRY
// ==========================================================

if (poultryStatsRoutes) {

  app.use(
    "/poultry-stats",
    poultryStatsRoutes
  );

}


if (eggRoutes) {

  app.use(
    "/eggs",
    eggRoutes
  );

}


if (cageRoutes) {

  app.use(
    "/cage",
    cageRoutes
  );

}


if (nursingRoutes) {

  app.use(
    "/nursing",
    nursingRoutes
  );

}


if (incubationRoutes) {

  app.use(
    "/incubation",
    incubationRoutes
  );

}


if (financeRoutes) {

  app.use(
    "/finance",
    financeRoutes
  );

}


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
// 404
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


    if (
      err &&
      err.name === "MulterError" &&
      err.code === "LIMIT_FILE_SIZE"
    ) {

      statusCode =
        400;

      err.message =
        "The uploaded image is too large. Maximum size is 5MB.";

    }


    if (
      req.accepts("html")
    ) {

      const views = {

        400:
          "400",

        401:
          "401",

        403:
          "403",

        404:
          "404",

        409:
          "409",

        422:
          "422",

        500:
          "500"

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


    return res.status(
      statusCode
    ).json({

      success:
        false,

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

const startServer = (port) => {

  server.listen(

    port,

    () => {

      console.log(
        `🚀 Server running on port ${port}`
      );

    }

  );

};


// ==========================================================
// SERVER ERROR
// ==========================================================

server.on(

  "error",

  (error) => {

    if (
      error.code ===
      "EADDRINUSE"
    ) {

      console.error(
        `❌ Port ${PORT} is already in use. Free it or set a different port in the environment.`
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

process.on(

  "SIGTERM",

  () => {

    console.log(
      "🛑 Received SIGTERM. Shutting down gracefully..."
    );


    server.close(
      () => process.exit(0)
    );

  }

);


process.on(

  "SIGINT",

  () => {

    console.log(
      "🛑 Received SIGINT. Shutting down gracefully..."
    );


    server.close(
      () => process.exit(0)
    );

  }

);


// ==========================================================
// DATABASE BOOTSTRAP
// ==========================================================

const bootstrap = async () => {

  try {

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
        "⚠️ MongoDB is unavailable. Starting server without database initialization."
      );

    }


    startServer(PORT);

  } catch (error) {

    console.error(
      "❌ Application bootstrap failed:",
      error
    );


    if (isProduction) {

      process.exit(1);

    }


    startServer(PORT);

  }

};


// ==========================================================
// START APPLICATION
// ==========================================================

bootstrap();