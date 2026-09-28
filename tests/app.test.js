import request from "supertest";
import app from "../app.js";

describe("App smoke tests", () => {
  it("responds to GET / with a status message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "a-to-z-toys API is running" });
  });

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
  });

  it("parses JSON bodies", async () => {
    const res = await request(app)
      .post("/categories")
      .send({ name: "X" }); // invalid but must not be a body-parsing error
    expect(res.status).not.toBe(500);
  });
});