import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Restrict credentialed CORS to known safe origins.
// In development the proxy is same-origin from the browser's perspective,
// so an explicit allowlist is sufficient and prevents arbitrary-origin abuse.
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  /\.replit\.dev$/,        // Replit preview & deployed domains
  /\.repl\.co$/,           // legacy Replit domains
  "http://localhost:19852", // local Vite dev server
  "http://127.0.0.1:19852",
];
app.use((req, res, next) =>
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // Same-origin (e.g. Vercel deployment serving both frontend and API)
      let sameHost = false;
      try { sameHost = new URL(origin).host === req.headers.host; } catch {}
      const allowed = sameHost || ALLOWED_ORIGINS.some(o =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      cb(null, allowed);
    },
    credentials: true,
  })(req, res, next),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const isProd = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

app.use("/api", router);

export default app;
