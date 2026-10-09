import "dotenv/config";
import app from "./app.js";
import { ensureSchema, dataSource } from "./models/repositoryFactory.js";
import { productRepository } from "./models/index.js";
import { settingsRepository } from "./models/index.js";
import { loadFeatureSettings } from "./config/features.js";

const PORT = process.env.PORT || 3000;

await ensureSchema();
// Backfill the isActive/reviewsEnabled flags on rows created before they
// existed, so the admin UI and the public catalogue agree on defaults.
await productRepository.backfillFlags();
// Load feature settings from database for dynamic toggles
await loadFeatureSettings(settingsRepository);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (engine: ${dataSource})`);
});