import app from "./app.js";
import { ensureSchema } from "./models/repositoryFactory.js";

const PORT = process.env.PORT || 3000;

await ensureSchema();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});