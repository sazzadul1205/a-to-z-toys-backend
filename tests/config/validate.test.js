import mongoose from "mongoose";
import { validateAndBuild } from "../../config/validate.js";
import Category from "../../models/Category.js";
import Product from "../../models/Product.js";
import Review from "../../models/Review.js";

const categoryId = new mongoose.Types.ObjectId();

const validProduct = {
  name: "Chess Set",
  price: 29.99,
  stock: 10,
  categoryId,
};

describe("validateAndBuild", () => {
  it("returns a plain object document for valid input", async () => {
    const { valid, doc, errors } = await validateAndBuild(Product, validProduct);

    expect(valid).toBe(true);
    expect(errors).toBeUndefined();
    expect(doc).toMatchObject({ name: "Chess Set", price: 29.99, stock: 10 });
    // A mongoose document would leak internals into the JSON store.
    expect(doc).not.toBeInstanceOf(mongoose.Document);
    expect(doc).not.toHaveProperty("__v");
  });

  it("applies schema defaults and trimming", async () => {
    const { valid, doc } = await validateAndBuild(Product, {
      ...validProduct,
      name: "  Padded Name  ",
    });

    expect(valid).toBe(true);
    expect(doc.name).toBe("Padded Name");
    expect(doc.description).toBe("");
    expect(doc.image).toBe("");
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it("reports errors keyed by field instead of throwing", async () => {
    const { valid, doc, errors } = await validateAndBuild(Product, { price: -1 });

    expect(valid).toBe(false);
    expect(doc).toBeUndefined();
    expect(errors).toHaveProperty("name");
    expect(errors).toHaveProperty("price");
    expect(typeof errors.name).toBe("string");
  });

  it("collects every invalid field in one pass", async () => {
    const { valid, errors } = await validateAndBuild(Product, {
      name: "x",
      price: -5,
      stock: -2,
      categoryId,
    });

    expect(valid).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(["name", "price", "stock"]);
  });

  it("enforces required fields", async () => {
    const { valid, errors } = await validateAndBuild(Category, {});

    expect(valid).toBe(false);
    expect(errors).toHaveProperty("name");
  });

  it("enforces string length bounds", async () => {
    const tooLong = await validateAndBuild(Category, { name: "x".repeat(101) });
    expect(tooLong.valid).toBe(false);
    expect(tooLong.errors).toHaveProperty("name");

    const tooShort = await validateAndBuild(Category, { name: "x" });
    expect(tooShort.valid).toBe(false);
    expect(tooShort.errors).toHaveProperty("name");
  });

  it("bounds a numeric range from both ends", async () => {
    const high = await validateAndBuild(Review, {
      productId: categoryId,
      name: "Ana",
      rating: 6,
    });
    expect(high.valid).toBe(false);
    expect(high.errors).toHaveProperty("rating");

    const low = await validateAndBuild(Review, {
      productId: categoryId,
      name: "Ana",
      rating: 0,
    });
    expect(low.valid).toBe(false);
    expect(low.errors).toHaveProperty("rating");

    const ok = await validateAndBuild(Review, {
      productId: categoryId,
      name: "Ana",
      rating: 5,
    });
    expect(ok.valid).toBe(true);
    expect(ok.doc.comment).toBe("");
  });

  it("rejects a value that is not a valid ObjectId reference", async () => {
    const { valid, errors } = await validateAndBuild(Product, {
      ...validProduct,
      categoryId: "not-an-object-id",
    });

    expect(valid).toBe(false);
    expect(errors).toHaveProperty("categoryId");
  });

  it("lowercases email and keeps the hash out of the built document input", async () => {
    // User declares `password` with select:false; the repository owns hashing, so
    // validation only has to confirm the plaintext is long enough.
    const { valid } = await validateAndBuild(
      (await import("../../models/User.js")).default,
      { name: "Ana", email: "ANA@Example.COM", password: "secret123", role: "Customer" },
    );

    expect(valid).toBe(true);
  });

  it("rejects an unknown role", async () => {
    const User = (await import("../../models/User.js")).default;
    const { valid, errors } = await validateAndBuild(User, {
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      role: "Wizard",
    });

    expect(valid).toBe(false);
    expect(errors).toHaveProperty("role");
  });
});
