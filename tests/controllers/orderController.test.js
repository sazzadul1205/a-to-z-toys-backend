import { cleanData, validCategory, validProduct, validUser } from "../helpers/testEnv.js";
import { api, setupAdmin } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterAll(async () => {
  await cleanData();
});

async function seedBasics(stock = 10, price = 10) {
  const cat = (await api().post("/categories").send(validCategory())).body;
  const product = (
    await api().post("/products").send(validProduct(cat._id, { stock, price }))
  ).body;
  const user = (await api().post("/users").send(validUser())).body;
  return { cat, product, user };
}

describe("Order API", () => {
  describe("POST /orders", () => {
    it("creates an order with server-calculated total", async () => {
      const { product, user } = await seedBasics(10, 5);
      const res = await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 3,
        totalPrice: 0, // should be ignored
      });
      expect(res.status).toBe(201);
      expect(res.body.totalPrice).toBe(15);
      expect(res.body.status).toBe("Pending");
    });

    it("rejects unknown user", async () => {
      const { product } = await seedBasics();
      const res = await api().post("/orders").send({
        userId: "000000000000000000000000",
        productId: product._id,
        quantity: 1,
      });
      expect(res.status).toBe(400);
    });

    it("rejects unknown product", async () => {
      const { user } = await seedBasics();
      const res = await api().post("/orders").send({
        userId: user._id,
        productId: "000000000000000000000000",
        quantity: 1,
      });
      expect(res.status).toBe(400);
    });

    it("rejects non-integer quantity", async () => {
      const { product, user } = await seedBasics();
      const res = await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 1.5,
      });
      expect(res.status).toBe(400);
    });

    it("rejects quantity <= 0", async () => {
      const { product, user } = await seedBasics();
      const res = await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 0,
      });
      expect(res.status).toBe(400);
    });

    it("rejects when stock is insufficient", async () => {
      const { product, user } = await seedBasics(2);
      const res = await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 5,
      });
      expect(res.status).toBe(409);
    });

    it("decrements product stock after order", async () => {
      const { product, user } = await seedBasics(10);
      await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 4,
      });
      const p = await api().get(`/products/${product._id}`);
      expect(p.body.stock).toBe(6);
    });
  });

  describe("GET /orders", () => {
    it("filters by userId", async () => {
      const { product, user } = await seedBasics();
      await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 1,
      });
      const res = await api().get(`/orders?userId=${user._id}`);
      expect(res.body).toHaveLength(1);
    });

    it("filters by status", async () => {
      const { product, user } = await seedBasics();
      await api().post("/orders").send({
        userId: user._id,
        productId: product._id,
        quantity: 1,
      });
      const res = await api().get("/orders?status=Pending");
      expect(res.body).toHaveLength(1);
    });
  });

  describe("PUT /orders/:id", () => {
    it("updates status to Processing", async () => {
      const { product, user } = await seedBasics();
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 1,
        })
      ).body;
      const res = await api()
        .put(`/orders/${order._id}`)
        .send({ status: "Processing" });
      expect(res.body.status).toBe("Processing");
    });

    it("restores stock when cancelled", async () => {
      const { product, user } = await seedBasics(10);
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 4,
        })
      ).body;
      await api().put(`/orders/${order._id}`).send({ status: "Cancelled" });
      const p = await api().get(`/products/${product._id}`);
      expect(p.body.stock).toBe(10);
    });

    it("re-decrements stock when un-cancelling", async () => {
      const { product, user } = await seedBasics(10);
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 4,
        })
      ).body;
      await api().put(`/orders/${order._id}`).send({ status: "Cancelled" });
      await api().put(`/orders/${order._id}`).send({ status: "Processing" });
      const p = await api().get(`/products/${product._id}`);
      expect(p.body.stock).toBe(6);
    });

    it("rejects modifying immutable fields", async () => {
      const { product, user } = await seedBasics();
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 1,
        })
      ).body;
      const res = await api()
        .put(`/orders/${order._id}`)
        .send({ quantity: 5 });
      expect(res.status).toBe(400);
    });

    it("rejects update without status", async () => {
      const { product, user } = await seedBasics();
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 1,
        })
      ).body;
      const res = await api().put(`/orders/${order._id}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /orders/:id", () => {
    it("restores stock when deleting a non-cancelled order", async () => {
      const { product, user } = await seedBasics(10);
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 4,
        })
      ).body;
      await api().delete(`/orders/${order._id}`);
      const p = await api().get(`/products/${product._id}`);
      expect(p.body.stock).toBe(10);
    });

    it("does not double-restore stock when deleting a cancelled order", async () => {
      const { product, user } = await seedBasics(10);
      const order = (
        await api().post("/orders").send({
          userId: user._id,
          productId: product._id,
          quantity: 4,
        })
      ).body;
      await api().put(`/orders/${order._id}`).send({ status: "Cancelled" });
      await api().delete(`/orders/${order._id}`);
      const p = await api().get(`/products/${product._id}`);
      expect(p.body.stock).toBe(10);
    });
  });
});