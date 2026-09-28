import request from "supertest";
import app from "../../app.js";
import { cleanData } from "../helpers/testEnv.js";
import { validCategory } from "../helpers/testEnv.js";

beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("Category API", () => {
  describe("POST /categories", () => {
    it("creates a category", async () => {
      const res = await request(app).post("/categories").send(validCategory());
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: "Board Games" });
      expect(res.body._id).toBeDefined();
    });

    it("rejects missing name", async () => {
      const res = await request(app).post("/categories").send({ description: "x" });
      expect(res.status).toBe(400);
      expect(res.body.errors.name).toBeDefined();
    });

    it("rejects name shorter than 2 chars", async () => {
      const res = await request(app).post("/categories").send({ name: "A" });
      expect(res.status).toBe(400);
    });

    it("rejects duplicate name (case-insensitive)", async () => {
      await request(app).post("/categories").send(validCategory({ name: "Games" }));
      const res = await request(app).post("/categories").send(validCategory({ name: "games" }));
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  describe("GET /categories", () => {
    it("returns empty array when no categories", async () => {
      const res = await request(app).get("/categories");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all categories", async () => {
      await request(app).post("/categories").send(validCategory({ name: "One" }));
      await request(app).post("/categories").send(validCategory({ name: "Two" }));
      const res = await request(app).get("/categories");
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /categories/:id", () => {
    it("returns the category", async () => {
      const created = await request(app).post("/categories").send(validCategory());
      const res = await request(app).get(`/categories/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(created.body._id);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).get("/categories/does-not-exist");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /categories/:id", () => {
    it("updates the name", async () => {
      const created = await request(app).post("/categories").send(validCategory());
      const res = await request(app)
        .put(`/categories/${created.body._id}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
    });

    it("preserves _id and createdAt on update", async () => {
      const created = await request(app).post("/categories").send(validCategory());
      const res = await request(app)
        .put(`/categories/${created.body._id}`)
        .send({ name: "New Name" });
      expect(res.body._id).toBe(created.body._id);
      expect(res.body.createdAt).toBe(created.body.createdAt);
    });

    it("rejects rename to an existing name", async () => {
      await request(app).post("/categories").send(validCategory({ name: "Alpha" }));
      const beta = await request(app).post("/categories").send(validCategory({ name: "Beta" }));
      const res = await request(app)
        .put(`/categories/${beta.body._id}`)
        .send({ name: "alpha" });
      expect(res.status).toBe(409);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).put("/categories/nope").send({ name: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /categories/:id", () => {
    it("deletes the category", async () => {
      const created = await request(app).post("/categories").send(validCategory());
      const res = await request(app).delete(`/categories/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await request(app).get(`/categories/${created.body._id}`);
      expect(check.status).toBe(404);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).delete("/categories/nope");
      expect(res.status).toBe(404);
    });
  });
});