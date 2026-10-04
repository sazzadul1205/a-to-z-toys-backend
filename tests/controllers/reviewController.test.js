import { cleanData, validCategory, validProduct } from "../helpers/testEnv.js";
import { api, setupAdmin } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterAll(async () => {
  await cleanData();
});

async function makeProduct() {
  const cat = (await api().post("/categories").send(validCategory()))
    .body;
  return (await api().post("/products").send(validProduct(cat._id)))
    .body;
}

describe("Review API", () => {
  describe("POST /reviews", () => {
    it("creates a review", async () => {
      const p = await makeProduct();
      const res = await api().post("/reviews").send({
        productId: p._id,
        name: "Jane",
        rating: 5,
        comment: "Excellent",
      });
      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
    });

    it("rejects unknown product", async () => {
      const res = await api().post("/reviews").send({
        productId: "000000000000000000000000",
        name: "Jane",
        rating: 5,
      });
      expect(res.status).toBe(400);
    });

    it("rejects rating above 5", async () => {
      const p = await makeProduct();
      const res = await api().post("/reviews").send({
        productId: p._id,
        name: "Jane",
        rating: 6,
      });
      expect(res.status).toBe(400);
    });

    it("rejects rating below 1", async () => {
      const p = await makeProduct();
      const res = await api().post("/reviews").send({
        productId: p._id,
        name: "Jane",
        rating: 0,
      });
      expect(res.status).toBe(400);
    });

    it("rejects a name shorter than 2 characters", async () => {
      const p = await makeProduct();
      const res = await api().post("/reviews").send({
        productId: p._id,
        name: "A",
        rating: 5,
      });
      expect(res.status).toBe(400);
      expect(res.body.errors.name).toBeDefined();
    });
  });

  describe("GET /reviews", () => {
    it("filters by productId", async () => {
      const p1 = await makeProduct();

      // build a second product in a different category
      const cat2 = (
        await api()
          .post("/categories")
          .send(validCategory({ name: "C2" }))
      ).body;
      expect(cat2._id).toBeDefined();

      const p2 = (
        await api()
          .post("/products")
          .send(validProduct(cat2._id, { name: "P2" }))
      ).body;
      expect(p2._id).toBeDefined();

      const r1 = await api()
        .post("/reviews")
        .send({ productId: p1._id, name: "Alice", rating: 4 });
      expect(r1.status).toBe(201);

      const r2 = await api()
        .post("/reviews")
        .send({ productId: p2._id, name: "Bob", rating: 3 });
      expect(r2.status).toBe(201);

      const res = await api().get(`/reviews?productId=${p1._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Alice");
    });
  });

  describe("PUT /reviews/:id", () => {
    it("updates the rating", async () => {
      const p = await makeProduct();
      const r = (
        await api().post("/reviews").send({
          productId: p._id,
          name: "Jane",
          rating: 4,
        })
      ).body;

      const res = await api()
        .put(`/reviews/${r._id}`)
        .send({ rating: 2 });
      expect(res.body.rating).toBe(2);
    });

    it("rejects changing productId", async () => {
      const p = await makeProduct();
      const r = (
        await api().post("/reviews").send({
          productId: p._id,
          name: "Jane",
          rating: 4,
        })
      ).body;

      const res = await api()
        .put(`/reviews/${r._id}`)
        .send({ productId: "000000000000000000000000" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /reviews/product/:productId/summary", () => {
    it("returns 0 average when no reviews", async () => {
      const p = await makeProduct();
      const res = await api().get(`/reviews/product/${p._id}/summary`);
      expect(res.body).toEqual({
        productId: p._id,
        count: 0,
        averageRating: 0,
      });
    });

    it("computes the average of multiple reviews", async () => {
      const p = await makeProduct();

      const a = await api()
        .post("/reviews")
        .send({ productId: p._id, name: "Alice", rating: 5 });
      const b = await api()
        .post("/reviews")
        .send({ productId: p._id, name: "Bob", rating: 3 });
      const c = await api()
        .post("/reviews")
        .send({ productId: p._id, name: "Carol", rating: 4 });
      expect([a.status, b.status, c.status]).toEqual([201, 201, 201]);

      const res = await api().get(`/reviews/product/${p._id}/summary`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.averageRating).toBe(4);
    });

    it("returns 404 for unknown product", async () => {
      const res = await api().get("/reviews/product/nope/summary");
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /reviews/:id", () => {
    it("deletes a review", async () => {
      const p = await makeProduct();
      const r = (
        await api().post("/reviews").send({
          productId: p._id,
          name: "Jane",
          rating: 4,
        })
      ).body;
      const res = await api().delete(`/reviews/${r._id}`);
      expect(res.status).toBe(200);
    });
  });
});
