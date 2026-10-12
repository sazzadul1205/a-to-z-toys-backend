import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanData, validCategory, validProduct } from "../../helpers/testEnv.js";
import { api, setupAdmin } from "../../helpers/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, "..", "..", "data"), "backups");

async function cleanBackups() {
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json") || f.endsWith(".tmp"));
      for (const f of files) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
      }
    }
  } catch {
    /* best-effort */
  }
}

async function seedSomeData() {
  const cat = (await api().post("/categories").send(validCategory())).body;
  const product = (await api().post("/products").send(validProduct(cat._id))).body;
  return { cat, product };
}

describe("Backup API", () => {
  beforeEach(async () => {
    await cleanData();
    await cleanBackups();
    await setupAdmin();
  });

  afterAll(async () => {
    await cleanData();
    cleanBackups();
  });

  describe("GET /backup", () => {
    it("returns empty list when no backups exist", async () => {
      const res = await api().get("/backup");
      expect(res.status).toBe(200);
      expect(res.body.backups).toEqual([]);
    });

    it("returns created backups after seeding", async () => {
      await seedSomeData();
      await api().post("/backup");
      const res = await api().get("/backup");
      expect(res.status).toBe(200);
      expect(res.body.backups.length).toBe(1);
      expect(res.body.backups[0]).toHaveProperty("filename");
      expect(res.body.backups[0]).toHaveProperty("size");
    });
  });

  describe("POST /backup", () => {
    it("creates a backup with all collections", async () => {
      const { cat, product } = await seedSomeData();
      const res = await api().post("/backup");
      expect(res.status).toBe(201);
      expect(res.body.filename).toMatch(/^backup-/);
      expect(res.body.message).toMatch(/created/i);

      const backupPath = path.join(BACKUP_DIR, res.body.filename);
      expect(fs.existsSync(backupPath)).toBe(true);

      const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
      expect(backup.data).toBeDefined();
      expect(backup.data.products).toBeDefined();
      expect(backup.data.products.length).toBe(1);
      expect(backup.data.categories).toBeDefined();
      expect(backup.data.categories.length).toBe(1);
      expect(backup.data.orders).toBeDefined();
    });
  });

  describe("DELETE /backup/:filename", () => {
    it("deletes an existing backup", async () => {
      await api().post("/backup");
      const list = await api().get("/backup");
      const filename = list.body.backups[0].filename;

      const res = await api().delete(`/backup/${filename}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);

      const listAfter = await api().get("/backup");
      expect(listAfter.body.backups.length).toBe(0);
    });

    it("returns 404 for non-existent backup", async () => {
      const res = await api().delete("/backup/nonexistent.json");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /backup/:filename/restore", () => {
    it("restores data from a backup", async () => {
      const { cat, product } = await seedSomeData();
      await api().post("/backup");

      const list = await api().get("/backup");
      const filename = list.body.backups[0].filename;

      const res = await api().post(`/backup/${filename}/restore`);
      expect(res.status).toBe(200);
      expect(res.body.restoreLog).toBeDefined();
    });

    it("returns 404 for restoring non-existent backup", async () => {
      const res = await api().post("/backup/nonexistent.json/restore");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /backup/:filename/data", () => {
    it("returns backup data", async () => {
      const { cat, product } = await seedSomeData();
      await api().post("/backup");

      const list = await api().get("/backup");
      const filename = list.body.backups[0].filename;

      const res = await api().get(`/backup/${filename}/data`);
      expect(res.status).toBe(200);
      expect(res.body.products).toBeDefined();
    });

    it("returns 404 for non-existent backup data", async () => {
      const res = await api().get("/backup/nonexistent.json/data");
      expect(res.status).toBe(404);
    });
  });
});

describe("Backup access control", () => {
  beforeEach(async () => {
    await cleanData();
  });

  afterAll(async () => {
    await cleanData();
  });

  it("rejects unauthenticated access", async () => {
    const res = await api().get("/backup");
    expect(res.status).toBe(401);
  });
});
