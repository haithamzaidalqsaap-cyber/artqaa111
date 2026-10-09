import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { loadSession, sameOrigin } from "./lib/auth";
import { errorHandler } from "./lib/http";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const apiRouter = express.Router();
apiRouter.use(cors({ origin: true, credentials: true }));
apiRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
apiRouter.use(express.json({ limit: "32kb" }));
apiRouter.use(cookieParser());
apiRouter.use(sameOrigin);
apiRouter.use(loadSession);
apiRouter.use(router);
apiRouter.use(errorHandler);

// Support both /api prefix and direct routes for Vercel Serverless Function rewrites
app.use("/api", apiRouter);
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    return next();
  }
  return apiRouter(req, res, next);
});

export default app;
