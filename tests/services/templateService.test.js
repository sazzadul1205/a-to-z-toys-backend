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

  it("upgrades already-seeded built-in templates while preserving custom header, footer, and styles", async () => {
    await receiptTemplateRepository.createTemplate({
      _id: "a4-standard",
      name: "a4-standard",
      version: 1,
      header_html: "<div>Custom header</div>",
      footer_html: "<div>Custom footer</div>",
      body_template: "<p>{{oldReceiptField}}</p>",
      css_styles: "body { color: navy; }",
      is_active: true,
    }, "test");

    await expect(templateService.ensureDefaults()).resolves.toBeUndefined();

    const upgraded = await receiptTemplateRepository.getActiveByName("a4-standard");
    expect(upgraded.version).toBe(2);
    expect(upgraded.body_template).not.toContain("oldReceiptField");
    expect(upgraded.header_html).toBe("<div>Custom header</div>");
    expect(upgraded.footer_html).toBe("<div>Custom footer</div>");
    expect(upgraded.css_styles).toBe("body { color: navy; }");

    const html = await templateService.getCompiledTemplate("a4-standard", {
      saleNumber: "SN-3",
      items: [{ name: "Toy", price: 12, quantity: 2 }],
      subtotal: 24,
      discount: 0,
      tax: 0,
      total: 24,
      amountPaid: 24,
    });
    expect(html).toContain("৳24.00");
    expect(html).not.toMatch(/\{\{[\s\S]*?\}\}/);
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

  it("renders nested receipt blocks, line totals, and fixed discounts without template expressions", async () => {
    await templateService.ensureDefaults();

    const html = await templateService.getCompiledTemplate("a4-standard", {
      saleNumber: "SN-2",
      cashier: "Cashier",
      paymentMethod: "Cash",
      items: [{ name: "Toy set", price: 24, quantity: 2 }],
      discount: 5,
      discountType: "fixed",
      discountValue: 5,
      total: 43,
      amountPaid: 40,
      balance: 3,
    });

    expect(html).toContain("Toy set");
    expect(html).toContain("৳48.00");
    expect(html).toContain("৳24.00");
    expect(html).toContain("Amount Paid");
    expect(html).toContain("Balance (Due)");
    expect(html).not.toContain("(5%)");
    expect(html).not.toMatch(/\{\{[\s\S]*?\}\}/);
  });

  it("normalizes the old fixed-discount label used by already-saved defaults", async () => {
    const oldTemplate = {
      name: "a4-standard",
      header_html: "",
      footer_html: "",
      css_styles: "",
      body_template: "<p>{{#if discountType}}{{#if discountValue}}({{discountValue}}%){{/if}}{{/if}}</p>",
    };
    const compiled = templateService.assembleHtml(oldTemplate);
    const html = templateService.render(compiled, {
      discountType: "fixed",
      discountValue: 500,
    });

    expect(html).not.toContain("(500%)");
    expect(html).not.toMatch(/\{\{[\s\S]*?\}\}/);

    const legacyPercentageHtml = templateService.render("<p>{{discountLabel}}</p>", {
      discountType: "percentage",
      discount: 5,
      subtotal: 50,
    });
    expect(legacyPercentageHtml).toContain("(10%)");
  });
});
