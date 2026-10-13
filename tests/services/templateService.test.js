import request from "supertest";
import app from "../../app.js";
import { cleanData } from "../helpers/testEnv.js";
import { templateService } from "../../services/templateService.js";
import { receiptTemplateRepository } from "../../models/index.js";

// ensureDefaults() is invoked at app boot only for non-JSON sources, but it is
// called explicitly here so the behaviour is verified identically on every
// backend.
beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("Receipt template bootstrap", () => {
  it("seeds the default templates without throwing", async () => {
    await expect(templateService.ensureDefaults()).resolves.toBeUndefined();

    const all = await receiptTemplateRepository.getAllActive();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.name).sort()).toEqual(["a4-standard", "pos-thermal"]);
    expect(all.every((t) => t.is_active === true)).toBe(true);
  });

  it("looks up a default template by name and returns null when missing", async () => {
    await templateService.ensureDefaults();

    const thermal = await receiptTemplateRepository.getActiveByName("pos-thermal");
    expect(thermal).toBeDefined();
    expect(thermal.name).toBe("pos-thermal");
    expect(thermal.is_active).toBe(true);
    expect(thermal).toHaveProperty("body_template");

    expect(
      await receiptTemplateRepository.getActiveByName("no-such-template"),
    ).toBeNull();
  });

  it("renders the public receipt endpoint from seeded defaults", async () => {
    await templateService.ensureDefaults();

    const res = await request(app)
      .post("/templates/receipts/pos-thermal")
      .send({
        saleNumber: "SN-1",
        items: [{ name: "Ball", price: 5, quantity: 2 }],
        total: 10,
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("A to Z Kids World");
    expect(res.text).toContain("SN-1");
  });
});
