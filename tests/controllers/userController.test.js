import bcrypt from "bcryptjs";
import { cleanData, validUser } from "../helpers/testEnv.js";
import { api, setupAdmin } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterAll(async () => {
  await cleanData();
});

describe("User API", () => {
  describe("POST /users", () => {
    it("creates a user and strips password from response", async () => {
      const res = await api().post("/users").send(validUser());
      expect(res.status).toBe(201);
      expect(res.body.email).toBe("alice@example.com");
      expect(res.body.password).toBeUndefined();
    });

    it("hashes the password on disk", async () => {
      await api().post("/users").send(validUser());

      const fs = await import("fs/promises");
      const path = await import("path");
      const { TEST_DATA_DIR } = await import("../helpers/testEnv.js");
      const raw = JSON.parse(
        await fs.readFile(path.join(TEST_DATA_DIR, "users.json"), "utf-8")
      );
      const alice = raw.find((u) => u.email === "alice@example.com");
      expect(alice).toBeDefined();
      expect(alice.password).not.toBe("secret123");
      expect(await bcrypt.compare("secret123", alice.password)).toBe(true);
    });

    it("rejects invalid email", async () => {
      const res = await api().post("/users").send(validUser({ email: "bad" }));
      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
    });

    it("rejects short password", async () => {
      const res = await api().post("/users").send(validUser({ password: "123" }));
      expect(res.status).toBe(400);
    });

    it("rejects duplicate email (case-insensitive)", async () => {
      await api().post("/users").send(validUser({ email: "a@b.com" }));
      const res = await api().post("/users").send(validUser({ email: "A@B.com" }));
      expect(res.status).toBe(409);
    });
  });

  describe("GET /users", () => {
    it("never leaks passwords", async () => {
      await api().post("/users").send(validUser());
      const res = await api().get("/users");
      expect(res.body.length).toBeGreaterThan(0);
      for (const user of res.body) {
        expect(user.password).toBeUndefined();
      }
    });
  });

  describe("GET /users/:id", () => {
    it("returns the user without password", async () => {
      const created = await api().post("/users").send(validUser());
      const res = await api().get(`/users/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.password).toBeUndefined();
    });

    it("returns 404 for unknown id", async () => {
      const res = await api().get("/users/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /users/:id", () => {
    it("updates the name", async () => {
      const created = await api().post("/users").send(validUser());
      const res = await api()
        .put(`/users/${created.body._id}`)
        .send({ name: "Alice Smith" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Smith");
      expect(res.body.password).toBeUndefined();
    });

    it("re-hashes a new password", async () => {
      const created = await api().post("/users").send(validUser());
      await api()
        .put(`/users/${created.body._id}`)
        .send({ password: "newsecret" });

      const fs = await import("fs/promises");
      const path = await import("path");
      const { TEST_DATA_DIR } = await import("../helpers/testEnv.js");
      const raw = JSON.parse(
        await fs.readFile(path.join(TEST_DATA_DIR, "users.json"), "utf-8")
      );
      const alice = raw.find((u) => u.email === "alice@example.com");
      expect(await bcrypt.compare("newsecret", alice.password)).toBe(true);
    });

    it("rejects changing to an existing email", async () => {
      await api().post("/users").send(validUser({ email: "a@b.com" }));
      const other = await api().post("/users").send(validUser({ email: "c@d.com" }));
      const res = await api()
        .put(`/users/${other.body._id}`)
        .send({ email: "a@b.com" });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /users/:id", () => {
    it("deletes user", async () => {
      const created = await api().post("/users").send(validUser());
      const res = await api().delete(`/users/${created.body._id}`);
      expect(res.status).toBe(200);

      const check = await api().get(`/users/${created.body._id}`);
      expect(check.status).toBe(404);
    });
  });
});