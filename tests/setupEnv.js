import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runs before the test framework and before any test file is imported, so this
// is in place before models/JsonRepository.js is evaluated and captures
// DATA_DIR. Tests then read and write here instead of the real ./data.
process.env.DATA_DIR = path.join(__dirname, "..", ".test-data");
