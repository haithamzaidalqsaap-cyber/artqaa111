import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTsxRunning = process.execArgv.some((a) => a.includes("tsx")) || Boolean(process.env.__TSX_BOOTSTRAP);

if (!isTsxRunning) {
  const result = spawnSync(process.execPath, ["--import", "tsx", __filename, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, __TSX_BOOTSTRAP: "1" },
  });
  process.exit(result.status ?? 0);
}

const express = (await import("express")).default;
const app = (await import("./artifacts/api-server/src/app")).default;
const { logger } = await import("./artifacts/api-server/src/lib/logger");
const { startAccrualWorker } = await import("./artifacts/api-server/src/lib/platform");
const { ensureInitialFirebaseData } = await import("./artifacts/api-server/src/lib/firebase");

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
        allowedHosts: true,
      },
      appType: "spa",
      root: path.resolve(__dirname, "artifacts/irtiqa"),
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "artifacts/irtiqa/dist/public");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, `Server listening on http://0.0.0.0:${PORT}`);
    ensureInitialFirebaseData().catch((err) => {
      logger.warn({ err }, "Initial Firebase seed skipped or failed");
    });
    try {
      startAccrualWorker();
    } catch (e) {
      logger.warn({ error: e }, "Accrual worker did not start");
    }
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
