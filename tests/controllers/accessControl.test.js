import request from "supertest";
import app from "../../app.js";
import { cleanData, validCategory, validProduct, validUser } from "../helpers/testEnv.js";
import {
  ADMIN_USER,
  api,
  customerApi,
  setupAdmin,
  setupCustomer,
} from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterEach(() => {
  delete process.env.REVIEW_SUBMIT_LIMIT;
});

afterAll(async () => {
  await cleanData();
});

async function seedProduct() {
  const category = (await api().post("/categories").send(validCategory())).body;
  return (await api().post("/products").send(validProduct(category._id))).body;
}

describe("token revocation", () => {
  it("invalidates an issued token when the password changes", async () => {
    const email = "rotator@test.local";
    await api().post("/users").send(validUser({ email, role: "Admin" }));

    const login = await request(app)
      .post("/auth/login")
      .send({ email, password: "secret123" });
    expect(login.status).toBe(200);

    const before = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(before.status).toBe(200);

    const me = login.body.user;
    await api().put(`/users/${me._id}`).send({ password: "a-brand-new-one" });

    const after = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(after.status).toBe(401);
    expect(after.body.error).toMatch(/invalidated/i);
  });

  it("accepts a fresh token after the password changes", async () => {
    const email = "rotator2@test.local";
    await api().post("/users").send(validUser({ email, role: "Admin" }));

    const me = (await request(app).post("/auth/login").send({ email, password: "secret123" }))
      .body.user;
    await api().put(`/users/${me._id}`).send({ password: "a-brand-new-one" });

    const relogin = await request(app)
      .post("/auth/login")
      .send({ email, password: "a-brand-new-one" });
    expect(relogin.status).toBe(200);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${relogin.body.token}`);
    expect(res.status).toBe(200);
  });
});

describe("last admin protection", () => {
  it("refuses to demote the only Admin", async () => {
    const users = (await api().get("/users")).body;
    const admin = users.find((u) => u.email === ADMIN_USER.email);

    const res = await api().put(`/users/${admin._id}`).send({ role: "Customer" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/last remaining admin/i);
  });

  it("refuses to delete the only Admin", async () => {
    const users = (await api().get("/users")).body;
    const admin = users.find((u) => u.email === ADMIN_USER.email);

    const res = await api().delete(`/users/${admin._id}`);
    expect(res.status).toBe(409);
  });

  it("allows demotion once a second Admin exists", async () => {
    const second = await api()
      .post("/users")
      .send(validUser({ email: "second@test.local", role: "Admin" }));
    expect(second.status).toBe(201);

    const res = await api()
      .put(`/users/${second.body._id}`)
      .send({ role: "Customer" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Customer");
  });

  it("does not block changing an admin's password", async () => {
    const users = (await api().get("/users")).body;
    const admin = users.find((u) => u.email === ADMIN_USER.email);

    const res = await api()
      .put(`/users/${admin._id}`)
      .send({ password: "still-the-only-admin" });
    expect(res.status).toBe(200);
  });
});

describe("POST /auth/login hardening", () => {
  it("returns the same 401 for an unknown email and a wrong password", async () => {
    const unknown = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.local", password: "whatever123" });
    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: ADMIN_USER.email, password: "whatever123" });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknown.body.error).toBe(wrongPassword.body.error);
  });

  it("does not reveal that a password is wrong before checking the role", async () => {
    await api().post("/users").send(validUser({ email: "shopper@test.local" }));

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "shopper@test.local", password: "not-the-password" });
    expect(res.status).toBe(401);
  });
});

describe("POST /reviews submit budget", () => {
  it("rate limits anonymous submissions", async () => {
    process.env.REVIEW_SUBMIT_LIMIT = "2";
    const product = await seedProduct();

    const first = await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Ana", rating: 5 });
    const second = await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Ben", rating: 4 });
    const third = await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Cy", rating: 3 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(429);
    expect(third.body.error).toMatch(/too many reviews/i);
  });

  it("does not limit reads", async () => {
    process.env.REVIEW_SUBMIT_LIMIT = "1";
    const product = await seedProduct();
    await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Ana", rating: 5 });

    for (let i = 0; i < 4; i += 1) {
      const res = await request(app).get("/reviews");
      expect(res.status).toBe(200);
    }
  });
});

describe("public surface stays open", () => {
  it("lets anonymous visitors browse without a token", async () => {
    const product = await seedProduct();
    await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Ana", rating: 5 });

    expect((await request(app).get("/")).status).toBe(200);
    expect((await request(app).get("/categories")).status).toBe(200);
    expect((await request(app).get("/products")).status).toBe(200);
    expect((await request(app).get(`/products/${product._id}`)).status).toBe(200);
    expect((await request(app).get("/reviews")).status).toBe(200);
    expect(
      (await request(app).get(`/reviews/product/${product._id}/summary`)).status,
    ).toBe(200);
  });

  it("still refuses anonymous writes", async () => {
    expect((await request(app).post("/products").send({})).status).toBe(401);
    expect((await request(app).get("/users")).status).toBe(401);
  });

  it("refuses non-admin writes with 403", async () => {
    await setupCustomer();
    const product = await seedProduct();
    const review = await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Ana", rating: 5 });

    expect((await customerApi().delete(`/reviews/${review.body._id}`)).status).toBe(403);
    expect((await customerApi().put(`/reviews/${review.body._id}`, { rating: 1 })).status).toBe(403);
    expect((await customerApi().post("/products").send({})).status).toBe(403);
    expect((await customerApi().get("/users")).status).toBe(403);
  });
});