import { cleanData, validCategory, validProduct } from "../helpers/testEnv.js";
import { api, setupAdmin } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterAll(async () => {
  await cleanData();
});

async function makeCategory(name = "Cat") {
  const res = await api().post("/categories").send(validCategory({ name }));
  return res.body;
}

describe("Product API", () => {
  describe("POST /products", () => {
    it("creates a product", async () => {
      const cat = await makeCategory();
      const res = await api().post("/products").send(validProduct(cat._id));
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Chess Set");
    });

    it("rejects missing categoryId", async () => {
      const res = await api()
        .post("/products")
        .send({ name: "X", price: 1, stock: 0 });
      expect(res.status).toBe(400);
    });

    it("rejects nonexistent categoryId", async () => {
      const res = await api()
        .post("/products")
        .send(validProduct("000000000000000000000000"));
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/does not reference/i);
    });

    it("rejects negative price", async () => {
      const cat = await makeCategory();
      const res = await api()
        .post("/products")
        .send(validProduct(cat._id, { price: -1 }));
      expect(res.status).toBe(400);
    });
  });

  describe("GET /products", () => {
    it("filters by categoryId", async () => {
      const c1 = await makeCategory("C1");
      const c2 = await makeCategory("C2");
      await api().post("/products").send(validProduct(c1._id, { name: "P1" }));
      await api().post("/products").send(validProduct(c2._id, { name: "P2" }));

      const res = await api().get(`/products?categoryId=${c1._id}`);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("P1");
    });

    it("returns all products when no filter", async () => {
      const c = await makeCategory();
      await api().post("/products").send(validProduct(c._id, { name: "P1" }));
      await api().post("/products").send(validProduct(c._id, { name: "P2" }));
      const res = await api().get("/products");
      expect(res.body.products).toHaveLength(2);
    });
  });

  describe("GET /products/:id", () => {
    it("returns 404 for unknown id", async () => {
      const res = await api().get("/products/nope");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /products/:id", () => {
    it("updates the price", async () => {
      const cat = await makeCategory();
      const p = await api().post("/products").send(validProduct(cat._id));
      const res = await api()
        .put(`/products/${p.body._id}`)
        .send({ price: 99.99 });
      expect(res.body.price).toBe(99.99);
    });

    it("verifies new categoryId exists", async () => {
      const cat = await makeCategory();
      const p = await api().post("/products").send(validProduct(cat._id));
      const res = await api()
        .put(`/products/${p.body._id}`)
        .send({ categoryId: "000000000000000000000000" });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /products/:id", () => {
    it("deletes a product", async () => {
      const cat = await makeCategory();
      const p = await api().post("/products").send(validProduct(cat._id));
      const res = await api().delete(`/products/${p.body._id}`);
      expect(res.status).toBe(200);
    });
  });
});