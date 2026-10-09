import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import router from "./routes";
import { loadSession, sameOrigin } from "./lib/auth";
import { errorHandler } from "./lib/http";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const apiRouter = express.Router();
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

app.use("/api", apiRouter);

export default app;
