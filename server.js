import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the app's own directory, not process.cwd().
// Under cPanel/Passenger cwd is often "/" so the default lookup fails.
dotenv.config({ path: path.join(__dirname, ".env") });

// Fallback prevents "options.port should be >= 0 and < 65536" crash.
// On cPanel/Passenger, PORT is injected by the host — do NOT set it in .env.
const PORT = process.env.PORT || 3000;

async function main() {
  // Dynamic imports AFTER dotenv so config modules that read process.env at
  // module load time (dataSource.js, features.js, etc.) see real values.
  const { default: app } = await import("./app.js");
  const { ensureSchema, dataSource } = await import("./models/repositoryFactory.js");
  const { productRepository, settingsRepository } = await import("./models/index.js");
  const { loadFeatureSettings } = await import("./config/features.js");
  const { templateService } = await import("./services/templateService.js");

  try {
    await ensureSchema();
    await productRepository.backfillFlags();
    await loadFeatureSettings(settingsRepository);
    await templateService.ensureDefaults();
  } catch (err) {
    console.error("[startup] init failed:", err);
    // Re-throw so Passenger logs it and the app fails loudly instead of
    // half-starting and returning 503 with no explanation.
    throw err;
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (engine: ${dataSource})`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || "development"}`);
    console.log(`CORS_ORIGIN=${process.env.CORS_ORIGIN || "(default)"}`);
  });

  // Graceful shutdown so Passenger can stop us cleanly.
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      console.log(`${sig} received, closing server...`);
      server.close(() => process.exit(0));
    });
  }

  return server;
}

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

main().catch((err) => {
  console.error("[fatal] startup failed:", err);
  process.exit(1);
});