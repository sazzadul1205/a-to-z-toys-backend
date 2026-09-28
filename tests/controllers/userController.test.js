import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../app.js";
import { cleanData, validUser } from "../helpers/testEnv.js";

beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("User API", () => {
  describe("POST /users", () => {
    it("creates a user and strips password from response", async () => {
      const res = await request(app).post("/users").send(validUser());
      expect(res.status).toBe(201);
      expect(res.body.email).toBe("alice@example.com");
      expect(res.body.password).toBeUndefined();
    });

    it("hashes the password on disk", async () => {
      await request(app).post("/users").send(validUser());
      const list = await request(app).get("/users");
      const user = list.body[0];

      // re-read raw record to check the hash
      const fs = await import("fs/promises");
      const path = await import("path");
      const { TEST_DATA_DIR } = await import("../helpers/testEnv.js");
      const raw = JSON.parse(
        await fs.readFile(path.join(TEST_DATA_DIR, "users.json"), "utf-8")
      );
      expect(raw[0].password).not.toBe("secret123");
      expect(await bcrypt.compare("secret123", raw[0].password)).toBe(true);
    });

    it("rejects invalid email", async () => {
      const res = await request(app).post("/users").send(validUser({ email: "bad" }));
      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
    });

    it("rejects short password", async () => {
      const res = await request(app).post("/users").send(validUser({ password: "123" }));
      expect(res.status).toBe(400);
    });

    it("rejects duplicate email (case-insensitive)", async () => {
      await request(app).post("/users").send(validUser({ email: "a@b.com" }));
      const res = await request(app).post("/users").send(validUser({ email: "A@B.com" }));
      expect(res.status).toBe(409);
    });
  });

  describe("GET /users", () => {
    it("never leaks passwords", async () => {
      await request(app).post("/users").send(validUser());
      const res = await request(app).get("/users");
      expect(res.body[0].password).toBeUndefined();
    });
  });

  describe("GET /users/:id", () => {
    it("returns the user without password", async () => {
      const created = await request(app).post("/users").send(validUser());
      const res = await request(app).get(`/users/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.password).toBeUndefined();
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).get("/users/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /users/:id", () => {
    it("updates the name", async () => {
      const created = await request(app).post("/users").send(validUser());
      const res = await request(app)
        .put(`/users/${created.body._id}`)
        .send({ name: "Alice Smith" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Smith");
      expect(res.body.password).toBeUndefined();
    });

    it("re-hashes a new password", async () => {
      const created = await request(app).post("/users").send(validUser());
      await request(app)
        .put(`/users/${created.body._id}`)
        .send({ password: "newsecret" });

      const fs = await import("fs/promises");
      const path = await import("path");
      const { TEST_DATA_DIR } = await import("../helpers/testEnv.js");
      const raw = JSON.parse(
        await fs.readFile(path.join(TEST_DATA_DIR, "users.json"), "utf-8")
      );
      expect(await bcrypt.compare("newsecret", raw[0].password)).toBe(true);
    });

    it("rejects changing to an existing email", async () => {
      await request(app).post("/users").send(validUser({ email: "a@b.com" }));
      const other = await request(app).post("/users").send(validUser({ email: "c@d.com" }));
      const res = await request(app)
        .put(`/users/${other.body._id}`)
        .send({ email: "a@b.com" });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /users/:id", () => {
    it("deletes user", async () => {
      const created = await request(app).post("/users").send(validUser());
      const res = await request(app).delete(`/users/${created.body._id}`);
      expect(res.status).toBe(200);

      const check = await request(app).get(`/users/${created.body._id}`);
      expect(check.status).toBe(404);
    });
  });
});