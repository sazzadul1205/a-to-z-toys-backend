import { validateAndBuild } from "../../config/validate.js";
import Category from "../../models/Category.js";
import Product from "../../models/Product.js";
import User from "../../models/User.js";

describe("validateAndBuild", () => {
  it("returns valid=true for valid category", async () => {
    const { valid, doc, errors } = await validateAndBuild(Category, {
      name: "Toys",
      description: "Fun toys",
    });
    expect(valid).toBe(true);
    expect(errors).toBeUndefined();
    expect(doc.name).toBe("Toys");
    expect(doc._id).toBeDefined();
    expect(doc.createdAt).toBeDefined();
  });

  it("returns valid=false and per-field errors for invalid input", async () => {
    const { valid, errors } = await validateAndBuild(Category, { name: "A" });
    expect(valid).toBe(false);
    expect(errors.name).toMatch(/shorter than the minimum/i);
  });

  it("rejects invalid email format", async () => {
    const { valid, errors } = await validateAndBuild(User, {
      name: "Bob",
      email: "not-an-email",
      password: "secret123",
    });
    expect(valid).toBe(false);
    expect(errors.email).toBe("Invalid email format");
  });

  it("rejects negative price", async () => {
    const { valid, errors } = await validateAndBuild(Product, {
      name: "Broke Toy",
      price: -5,
      stock: 0,
      categoryId: "000000000000000000000000",
    });
    expect(valid).toBe(false);
    // Mongoose 9 message: "Path `price` (-5) is less than minimum allowed value (0)."
    expect(errors.price).toMatch(/less than minimum/i);
  });

  it("applies defaults for optional fields", async () => {
    const { valid, doc } = await validateAndBuild(Product, {
      name: "Simple Toy",
      price: 10,
      stock: 3,
      categoryId: "000000000000000000000000",
    });
    expect(valid).toBe(true);
    expect(doc.description).toBe("");
    expect(doc.image).toBe("");
    // Mixed-type fields default to {} but may be omitted from toObject()
    expect(doc.details === undefined || typeof doc.details === "object").toBe(
      true,
    );
  });

  it("preserves explicit details object", async () => {
    const { valid, doc } = await validateAndBuild(Product, {
      name: "Detailed Toy",
      price: 10,
      stock: 3,
      categoryId: "000000000000000000000000",
      details: { color: "red", weight: "1kg" },
    });
    expect(valid).toBe(true);
    expect(doc.details).toEqual({ color: "red", weight: "1kg" });
  });

  it("does not emit version key", async () => {
    const { doc } = await validateAndBuild(Category, { name: "NoVersion" });
    expect(doc.__v).toBeUndefined();
  });
});
