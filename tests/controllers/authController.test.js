import request from "supertest";
import app from "../../app.js";
import { cleanData, validCategory, validProduct, validUser } from "../helpers/testEnv.js";
import { ADMIN_USER, api, customerApi, setupAdmin, setupCustomer } from "../helpers/auth.js";

beforeEach(async () => {
  await cleanData();
  await setupAdmin();
});

afterAll(async () => {
  await cleanData();
});

describe("POST /auth/login", () => {
  it("issues a token for valid admin credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: ADMIN_USER.email, password: ADMIN_USER.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe(ADMIN_USER.email);
    expect(res.body.user.role).toBe("Admin");
  });

  it("accepts an email in any casing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: ADMIN_USER.email.toUpperCase(), password: ADMIN_USER.password });

    expect(res.status).toBe(200);
  });

  it("never leaks the password hash", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: ADMIN_USER.email, password: ADMIN_USER.password });

    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: ADMIN_USER.email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
    expect(res.body.token).toBeUndefined();
  });

  it("rejects an unknown email with the same message", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.local", password: ADMIN_USER.password });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it("refuses non-admin accounts", async () => {
    await api().post("/users").send(validUser({ role: "Customer" }));

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "secret123" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("requires both fields", async () => {
    const res = await request(app).post("/auth/login").send({ email: ADMIN_USER.email });
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  it("returns the signed-in user", async () => {
    const res = await api().get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN_USER.email);
  });

  it("rejects a request with no token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects a token for an account that no longer exists", async () => {
    const second = await api()
      .post("/users")
      .send(validUser({ email: "second@test.local", role: "Admin" }));

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "second@test.local", password: "secret123" });
    expect(login.status).toBe(200);

    await api().delete(`/users/${second.body._id}`);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no longer exists/i);
  });
});

describe("authorization on storefront resources", () => {
  const protectedCalls = [
    ["post", "/categories", validCategory()],
    ["post", "/products", null],
    ["get", "/users", null],
    ["get", "/orders", null],
    ["post", "/upload/image", null],
  ];

  it("rejects unauthenticated access with 401", async () => {
    for (const [method, url, body] of protectedCalls) {
      const test = request(app)[method](url);
      const res = body ? await test.send(body) : await test;
      expect(res.status).toBe(401);
    }
  });

  it("rejects non-admin writes with 403", async () => {
    await setupCustomer();
    const res = await customerApi().post("/categories").send(validCategory({ name: "Nope" }));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("still allows anonymous reads of the catalogue", async () => {
    await api().post("/categories").send(validCategory());
    const categories = await request(app).get("/categories");
    const products = await request(app).get("/products");
    expect(categories.status).toBe(200);
    expect(products.status).toBe(200);
  });

  it("still allows anonymous review submissions", async () => {
    const category = (await api().post("/categories").send(validCategory())).body;
    const product = (
      await api()
        .post("/products")
        .send(validProduct(category._id))
    ).body;

    const res = await request(app)
      .post("/reviews")
      .send({ productId: product._id, name: "Walk-in", rating: 5 });

    expect(res.status).toBe(201);
  });

  it("blocks review edits for non-admins", async () => {
    const category = (await api().post("/categories").send(validCategory())).body;
    const product = (await api().post("/products").send(validProduct(category._id))).body;
    const review = (
      await request(app)
        .post("/reviews")
        .send({ productId: product._id, name: "Walk-in", rating: 4 })
    ).body;

    await setupCustomer();
    const res = await customerApi().put(`/reviews/${review._id}`).send({ rating: 1 });
    expect(res.status).toBe(403);
  });
});