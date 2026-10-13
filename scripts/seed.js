import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  categoryRepository,
  productRepository,
  userRepository,
  reviewRepository,
  orderRepository,
  stockMovementRepository,
  purchaseOrderRepository,
  expenseCategoryRepository,
  expenseRepository,
  settingsRepository,
  receiptTemplateRepository,
} from "../models/index.js";
import { validateAndBuild } from "../config/validate.js";
import Order from "../models/Order.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import {
  CATEGORIES,
  PRODUCTS,
  REVIEW_AUTHORS,
  REVIEW_COMMENTS,
} from "./catalogueSeeds.js";
import { DEFAULT_RECEIPT_TEMPLATES } from "./receiptTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "processed");
const SOURCE_IMAGES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "a-to-z-toys",
  "DriveDownloads",
);
const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
]);

const FORCE = process.argv.includes("--force");
const RESET_PASSWORD = process.argv.includes("--reset-password");
const DEMO_MODE = process.argv.includes("--demo");
const CATALOGUE_ONLY = process.argv.includes("--catalogue-only");
const SEED_DAYS = Number(process.env.SEED_DAYS || 90);

const DEFAULT_ADMIN_EMAIL = "admin@atozkids.world";
const DEFAULT_ADMIN_PASSWORD = "admin12345";

const ADMIN_EMAIL = (
  process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
).toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Store Admin";

function assertProductionSafety() {
  if (process.env.NODE_ENV !== "production") return;

  const problems = [];
  if (!process.env.SEED_ADMIN_EMAIL) problems.push("SEED_ADMIN_EMAIL is not set");
  if (!process.env.SEED_ADMIN_PASSWORD) {
    problems.push("SEED_ADMIN_PASSWORD is not set");
  } else if (process.env.SEED_ADMIN_PASSWORD.length < 12) {
    problems.push("SEED_ADMIN_PASSWORD must be at least 12 characters");
  }
  if (ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    problems.push("SEED_ADMIN_PASSWORD still uses the built-in default");
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to seed a production admin with unsafe credentials:\n  - ${problems.join(
        "\n  - ",
      )}`,
    );
  }
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x415a54);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const round2 = (n) => Math.round(n * 100) / 100;

const NOW = new Date();
const DAY_MS = 86400000;
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS);
const dateStamp = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const fallbackSku = (name) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

const resolveBuyPrice = (product) =>
  typeof product.buyPrice === "number" && product.buyPrice > 0
    ? product.buyPrice
    : Math.round((product.price || 0) * 0.6);

function listImages(dir) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en-US", { numeric: true }));
}

function ensureUploadImages() {
  const served = listImages(UPLOADS_DIR);
  if (served.length > 0) return served;

  const source = listImages(SOURCE_IMAGES_DIR).filter((f) =>
    f.startsWith("IMG-"),
  );
  if (source.length === 0) return [];

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  for (const file of source) {
    const target = path.join(UPLOADS_DIR, file);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(SOURCE_IMAGES_DIR, file), target);
    }
  }
  return listImages(UPLOADS_DIR);
}

const SHOPPER_ACCOUNTS = [
  { name: "Arif Hossain", phone: "01711-234-501", email: "arif.hossain@example.com", address: "12/5 Mirpur Road, Dhaka 1216" },
  { name: "Nusrat Jahan", phone: "01812-345-602", email: "nusrat.jahan@example.com", address: "7/2 Dhanmondi, Dhaka 1205" },
  { name: "Tanvir Ahmed", phone: "01913-456-703", email: "tanvir.ahmed@example.com", address: "48/1 Gulshan Avenue, Dhaka 1212" },
  { name: "Sharmin Akter", phone: "01614-567-804", email: "sharmin.akter@example.com", address: "19/3 Banani, Dhaka 1213" },
  { name: "Mahmud Hasan", phone: "01715-678-905", email: "mahmud.hasan@example.com", address: "88/2 Uttara, Dhaka 1230" },
  { name: "Rumana Parvin", phone: "01816-789-016", email: "rumana.parvin@example.com", address: "5/9 Mohammadpur, Dhaka 1207" },
  { name: "Fahim Rahman", phone: "01917-890-127", email: "fahim.rahman@example.com", address: "23/4 Malibagh, Dhaka 1217" },
  { name: "Tania Sultana", phone: "01618-901-238", email: "tania.sultana@example.com", address: "16/7 Wari, Dhaka 1203" },
];
const SHOPPER_PASSWORD = "demo123456";

const EXPENSE_CATEGORIES = [
  { name: "Rent", icon: "🏠", description: "Monthly shop rent", color: "#ef4444", sortOrder: 1 },
  { name: "Utilities", icon: "💡", description: "Electricity, water and internet", color: "#f59e0b", sortOrder: 2 },
  { name: "Salaries", icon: "👥", description: "Staff payroll", color: "#8b5cf6", sortOrder: 3 },
  { name: "Marketing", icon: "📣", description: "Ads and promotions", color: "#3b82f6", sortOrder: 4 },
  { name: "Shipping", icon: "🚚", description: "Delivery and courier", color: "#10b981", sortOrder: 5 },
  { name: "Packaging", icon: "📦", description: "Bags, boxes and wrap", color: "#f97316", sortOrder: 6 },
  { name: "Equipment", icon: "🛠️", description: "Tools and fixtures", color: "#6366f1", sortOrder: 7 },
  { name: "Miscellaneous", icon: "🧾", description: "Everything else", color: "#64748b", sortOrder: 8 },
];

const SUPPLIERS = [
  { name: "Dhaka Toy Traders", contact: "+8801712-100-200" },
  { name: "Kids Manufacturing Co.", contact: "+8801912-300-400" },
  { name: "PlayTime Wholesalers", contact: "+8801612-500-600" },
];

const AGE_RANGES = ["Ages 2+", "Ages 3–5", "Ages 4–8", "Ages 5–10", "Ages 6–12", "All ages"];
const INCLUDES = [
  "1 demo piece",
  "Assorted set",
  "Everything needed to get started",
  "Multi-piece pack",
  "Storage bag included",
  "Guide included",
];
const PRICE_TIERS = [1299, 1599, 1899, 2199, 2499, 2999, 3499, 3999, 4999];

async function ensureAdmin() {
  const existing = await userRepository.findOne(
    (u) => String(u.email).toLowerCase() === ADMIN_EMAIL,
  );

  if (existing) {
    const patch = {};
    if (existing.role !== "Admin") patch.role = "Admin";
    if (existing.name !== ADMIN_NAME) patch.name = ADMIN_NAME;
    if (RESET_PASSWORD) patch.password = ADMIN_PASSWORD;

    if (Object.keys(patch).length > 0) {
      await userRepository.updateUser(existing._id, patch);
      return { created: false, repaired: patch, email: ADMIN_EMAIL };
    }

    return { created: false, repaired: null, email: ADMIN_EMAIL };
  }

  await userRepository.createUser({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "Admin",
  });
  return { created: true, repaired: null, email: ADMIN_EMAIL };
}

async function ensureShoppers() {
  const shoppers = [];
  for (const shopper of SHOPPER_ACCOUNTS) {
    const existing = await userRepository.findOne(
      (u) => String(u.email).toLowerCase() === shopper.email,
    );
    if (existing) {
      shoppers.push({ ...existing, ...shopper });
      continue;
    }
    const created = await userRepository.createUser({
      name: shopper.name,
      email: shopper.email,
      password: SHOPPER_PASSWORD,
      role: "Customer",
    });
    shoppers.push({ ...created, ...shopper });
  }
  return shoppers;
}

async function seedStandardCatalogue() {
  const existingCategories = await categoryRepository.findAll();
  const categoryIds = new Map();
  for (const seed of CATEGORIES) {
    const existing = existingCategories.find(
      (c) => c.name.toLowerCase() === seed.name.toLowerCase(),
    );
    if (existing) {
      categoryIds.set(seed.name, existing._id);
      continue;
    }
    const created = await categoryRepository.createCategory(seed);
    categoryIds.set(seed.name, created._id);
  }
  console.log(`Categories ready: ${categoryIds.size}`);

  const uploads = listImages(UPLOADS_DIR);
  const existingProducts = await productRepository.findAll();
  const products = [];

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const seed = PRODUCTS[i];
    const categoryId = categoryIds.get(seed.category);
    if (!categoryId) continue;

    const existing = existingProducts.find(
      (p) => p.name.toLowerCase() === seed.name.toLowerCase(),
    );
    if (existing) {
      products.push(existing);
      continue;
    }

    const image =
      uploads.length > 0
        ? `/uploads/${uploads[i % uploads.length]}`
        : `https://images.unsplash.com/${seed.imageId}?auto=format&fit=crop&w=700&q=80`;

    const sku = fallbackSku(seed.name);

    const product = await productRepository.createProduct({
      name: seed.name,
      description: seed.description,
      price: seed.price,
      buyPrice: seed.buyPrice,
      stock: seed.stock,
      sku,
      categoryId,
      image,
      details: { age: seed.age, includes: seed.includes },
    });
    products.push(product);
  }
  console.log(`Products ready: ${products.length}`);
  return products;
}

async function seedDemoCatalogue() {
  const images = ensureUploadImages();
  if (images.length === 0) {
    console.log(
      "No images found in uploads/processed (or the DriveDownloads source). Catalogue not seeded.",
    );
    return [];
  }
  console.log(`Using ${images.length} uploaded images.`);

  const existingCategories = await categoryRepository.findAll();
  const categoryIds = new Map();
  for (const seed of CATEGORIES) {
    const existing = existingCategories.find(
      (c) => c.name.toLowerCase() === seed.name.toLowerCase(),
    );
    if (existing) {
      categoryIds.set(seed.name, existing._id);
      continue;
    }
    const created = await categoryRepository.createCategory(seed);
    categoryIds.set(seed.name, created._id);
  }
  console.log(`Categories ready: ${categoryIds.size}`);

  const allProducts = await productRepository.findAll();
  const isDemo = (p) => String(p.image || "").startsWith("/uploads/");
  let demoProducts = allProducts.filter(isDemo);

  if (FORCE) {
    let removed = 0;
    for (const product of demoProducts) {
      const reviews = await reviewRepository.find(
        (r) => String(r.productId) === String(product._id),
      );
      for (const review of reviews) {
        await reviewRepository.deleteById(review._id);
      }
      await productRepository.deleteById(product._id);
      removed += 1;
    }
    if (removed > 0) console.log(`Removed ${removed} demo products (--force).`);
    demoProducts = [];
  }

  const freshProducts = await productRepository.findAll();
  const byImage = new Map(freshProducts.map((p) => [String(p.image), p]));
  const categoryNames = [...categoryIds.keys()];
  const createdProducts = [];

  for (let i = 0; i < images.length; i += 1) {
    const file = images[i];
    const image = `/uploads/${file}`;
    const categoryName = categoryNames[i % categoryNames.length];
    const perCategory = Math.floor(i / categoryNames.length) + 1;
    const name = `${categoryName} Demo ${perCategory}`;

    const existing =
      byImage.get(image) || allProducts.find((p) => p.name === name);
    if (existing) {
      createdProducts.push(existing);
      continue;
    }

    const product = await productRepository.createProduct({
      name,
      description: "Demo product seeded from an uploaded photo.",
      price: PRICE_TIERS[i % PRICE_TIERS.length],
      stock: 8 + ((i * 5) % 45),
      categoryId: categoryIds.get(categoryName),
      image,
      details: {
        age: AGE_RANGES[i % AGE_RANGES.length],
        includes: INCLUDES[i % INCLUDES.length],
        sourceFile: file,
      },
    });
    createdProducts.push(product);
  }
  console.log(`Demo products ready: ${createdProducts.length}`);
  return createdProducts;
}

async function seedReviews(products) {
  const existingReviews = await reviewRepository.findAll();
  if (existingReviews.length > 0 && !FORCE) {
    console.log(`Reviews already seeded (${existingReviews.length}). Skipping.`);
    return 0;
  }

  let created = 0;
  for (const product of products) {
    const has = existingReviews.some(
      (r) => String(r.productId) === String(product._id),
    );
    if (has) continue;
    const count = int(3, 6);
    for (let i = 0; i < count; i += 1) {
      await reviewRepository.createReview({
        productId: product._id,
        name: pick(REVIEW_AUTHORS),
        rating: pick([5, 5, 5, 4, 4, 3]),
        comment: pick(REVIEW_COMMENTS),
        createdAt: daysAgo(int(2, Math.max(2, SEED_DAYS - 30))),
      });
      created += 1;
    }
  }
  return created;
}

async function applyStockChange({
  ledger,
  productId,
  delta,
  date,
  type,
  reason,
  referenceId,
  referenceType,
  userId,
}) {
  const pid = String(productId);
  const previousStock = ledger.get(pid) ?? 0;
  const newStock = previousStock + delta;
  ledger.set(pid, newStock);
  await productRepository.updateById(productId, { stock: newStock });
  await stockMovementRepository.createMovement({
    productId,
    type,
    quantity: Math.abs(delta),
    previousStock,
    newStock,
    reason,
    referenceId: referenceId || null,
    referenceType: referenceType || "Manual",
    userId: userId || null,
    createdAt: date,
  });
}

async function seedHistory(adminId, shoppers) {
  const existingOrders = await orderRepository.findAll();
  const existingPOs = await purchaseOrderRepository.findAll();
  if ((existingOrders.length > 0 || existingPOs.length > 0) && !FORCE) {
    console.log(
      `History already seeded (${existingOrders.length} orders, ${existingPOs.length} purchase orders). Skipping.`,
    );
    return { orders: 0, purchaseOrders: 0, movements: 0, docs: existingPOs };
  }

  const products = await productRepository.findAll();
  const ledger = new Map(products.map((p) => [String(p._id), p.stock]));
  const usedSaleNumbers = new Set(existingOrders.map((o) => o.saleNumber));
  const usedNumbers = new Set(existingPOs.map((po) => po.orderNumber));
  const poDocs = [];
  const events = [];

  const poDefs = [];
  for (let i = 0; i < 8; i += 1) {
    const supplier = SUPPLIERS[i % SUPPLIERS.length];
    const orderedAt = daysAgo(int(4, SEED_DAYS - 2));
    const itemCount = int(2, 4);
    const chosen = new Set();
    const items = [];
    while (items.length < itemCount) {
      const product = pick(products);
      if (chosen.has(String(product._id))) continue;
      chosen.add(String(product._id));
      const buyPrice = resolveBuyPrice(product);
      items.push({ product, quantity: int(10, 25), buyPrice });
    }
    poDefs.push({ supplier, orderedAt, items, outcome: i });
  }
  poDefs.sort((a, b) => a.orderedAt - b.orderedAt);

  for (const def of poDefs) {
    const { supplier, orderedAt, items, outcome } = def;

    let status;
    let receivedAt = null;
    if (outcome === 7) {
      status = "Cancelled";
    } else if (outcome === 5) {
      status = "Partial";
      receivedAt = new Date(orderedAt.getTime() + int(2, 6) * DAY_MS);
    } else {
      status = "Received";
      receivedAt = new Date(orderedAt.getTime() + int(2, 6) * DAY_MS);
    }

    const subtotal = round2(
      items.reduce((sum, i) => sum + i.buyPrice * i.quantity, 0),
    );
    const tax = round2(subtotal * 0.05);

    const poItems = items.map((i) => {
      let receivedQuantity = 0;
      if (status === "Partial") receivedQuantity = Math.ceil(i.quantity / 2);
      else if (status === "Received") receivedQuantity = i.quantity;
      return {
        productId: i.product._id,
        productName: i.product.name,
        sku: i.product.sku || fallbackSku(i.product.name),
        quantity: i.quantity,
        buyPrice: i.buyPrice,
        totalCost: round2(i.buyPrice * i.quantity),
        receivedQuantity,
      };
    });

    let orderNumber;
    do {
      orderNumber = `PO${dateStamp(orderedAt)}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;
    } while (usedNumbers.has(orderNumber));
    usedNumbers.add(orderNumber);

    const poData = {
      orderNumber,
      supplierName: supplier.name,
      supplierContact: supplier.contact,
      items: poItems,
      status,
      subtotal,
      tax,
      total: round2(subtotal + tax),
      notes:
        status === "Cancelled"
          ? "Supplier could not fulfil — cancelled"
          : pick(["", "", "Restock after festival rush", "Preferred supplier"]),
      orderedAt,
      receivedAt,
      createdBy: adminId,
      createdAt: orderedAt,
      updatedAt: receivedAt || orderedAt,
    };

    const { valid, doc, errors } = await validateAndBuild(PurchaseOrder, poData);
    if (!valid) {
      throw new Error(`Purchase order validation failed: ${JSON.stringify(errors)}`);
    }
    const po = await purchaseOrderRepository.create(doc);
    poDocs.push(po);

    if (receivedAt) {
      events.push({ date: receivedAt, kind: "receive", po, poItems, orderNumber });
    }
  }

  for (let day = SEED_DAYS; day >= 1; day -= 1) {
    if (rand() > 0.55) continue;
    const ordersToday = rand() < 0.25 ? 2 : 1;
    for (let k = 0; k < ordersToday; k += 1) {
      const date = daysAgo(day);
      date.setHours(int(10, 20), int(0, 59), 0, 0);
      events.push({ date, kind: "sale" });
    }
  }

  events.sort((a, b) => a.date - b.date);

  let orderCount = 0;
  let movementCount = 0;

  for (const event of events) {
    if (event.kind === "receive") {
      for (const item of event.poItems) {
        if (item.receivedQuantity < 1) continue;
        await applyStockChange({
          ledger,
          productId: item.productId,
          delta: item.receivedQuantity,
          date: event.date,
          type: "in",
          reason: `Purchase order ${event.orderNumber} received`,
          referenceId: event.po._id,
          referenceType: "PurchaseOrder",
          userId: adminId,
        });
        movementCount += 1;
      }
      continue;
    }

    const date = event.date;
    const shopper = pick(shoppers);
    const wanted = int(1, 3);
    const chosen = new Set();
    const items = [];
    let attempts = 0;
    while (items.length < wanted && attempts < 15) {
      attempts += 1;
      const product = pick(products);
      const pid = String(product._id);
      if (chosen.has(pid)) continue;
      const available = ledger.get(pid) ?? 0;
      if (available < 1) continue;
      const quantity = int(1, Math.min(3, available));
      chosen.add(pid);
      items.push({ product, quantity });
    }
    if (items.length === 0) continue;

    const roll = rand();
    let status;
    let paymentMethod;
    if (roll < 0.05) {
      paymentMethod = "due";
      status = "Due";
    } else if (roll < 0.11) {
      paymentMethod = pick(["cash", "card", "mobile"]);
      status = "Pending";
    } else if (roll < 0.14) {
      paymentMethod = pick(["cash", "card"]);
      status = "Cancelled";
    } else if (roll < 0.16) {
      paymentMethod = "card";
      status = "Refunded";
    } else {
      paymentMethod = pick(["cash", "cash", "cash", "card", "card", "mobile"]);
      status = "Completed";
    }

    const subtotal = round2(
      items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    );
    const hasDiscount = status === "Completed" && rand() < 0.2;
    const discountType = rand() < 0.5 ? "fixed" : "percentage";
    const discount = hasDiscount
      ? discountType === "percentage"
        ? round2((subtotal * int(5, 15)) / 100)
        : Math.min(int(100, 500), subtotal)
      : 0;
    const tax = rand() < 0.3 ? round2(subtotal * 0.05) : 0;
    const total = round2(subtotal - discount + tax);
    const amountPaid = status === "Due" ? 0 : total;
    const change = round2(Math.max(0, amountPaid - total));
    const balance = round2(Math.max(0, total - amountPaid));

    let saleNumber;
    do {
      saleNumber = `S${dateStamp(date)}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;
    } while (usedSaleNumbers.has(saleNumber));
    usedSaleNumbers.add(saleNumber);

    const orderData = {
      saleNumber,
      userId: shopper._id,
      customerName: shopper.name,
      customerPhone: shopper.phone,
      customerEmail: shopper.email,
      customerAddress: shopper.address,
      items: items.map((i) => ({
        productId: i.product._id,
        productName: i.product.name,
        sku: i.product.sku || fallbackSku(i.product.name),
        quantity: i.quantity,
        price: i.product.price,
        total: round2(i.product.price * i.quantity),
      })),
      paymentMethod,
      discountType,
      discount,
      tax,
      subtotal,
      total,
      amountPaid,
      change,
      balance,
      status,
      notes: pick(["", "", "", "Gift wrap please", "Call before delivery", "Deliver after 6 pm"]),
      cashierId: adminId,
      createdAt: date,
      updatedAt: date,
    };

    const { valid, doc, errors } = await validateAndBuild(Order, orderData);
    if (!valid) {
      throw new Error(`Order validation failed: ${JSON.stringify(errors)}`);
    }
    const order = await orderRepository.create(doc);
    orderCount += 1;

    if (status === "Cancelled" || status === "Refunded") continue;

    for (const i of items) {
      await applyStockChange({
        ledger,
        productId: i.product._id,
        delta: -i.quantity,
        date,
        type: "sale",
        reason: `POS Sale ${saleNumber}`,
        referenceId: order._id,
        referenceType: "Order",
        userId: shopper._id,
      });
      movementCount += 1;
    }
  }

  return {
    orders: orderCount,
    purchaseOrders: poDocs.length,
    movements: movementCount,
    docs: poDocs,
  };
}

async function seedExpenses(adminId, purchaseOrderDocs) {
  const existing = await expenseRepository.findAll();
  if (existing.length > 0 && !FORCE) {
    console.log(`Expenses already seeded (${existing.length}). Skipping.`);
    return 0;
  }

  const categoryIds = new Map();
  for (const seed of EXPENSE_CATEGORIES) {
    const existingCat = await expenseCategoryRepository.findOne(
      (c) => c.name.toLowerCase() === seed.name.toLowerCase(),
    );
    if (existingCat) {
      categoryIds.set(seed.name, existingCat._id);
      continue;
    }
    const created = await expenseCategoryRepository.createExpenseCategory(seed);
    categoryIds.set(seed.name, created._id);
  }
  console.log(`Expense categories ready: ${categoryIds.size}`);

  const entries = [];
  for (let back = SEED_DAYS - 1; back >= 1; back -= 30) {
    entries.push({ daysBack: back, category: "Rent", amount: 60000, vendor: "Mirpur Properties Ltd", paymentMethod: "bank_transfer", tags: ["monthly"], description: "Monthly shop rent" });
    entries.push({ daysBack: back - 7, category: "Utilities", amount: int(4500, 9500), vendor: "DPDC / WASA", paymentMethod: "bank_transfer", tags: ["utilities"], description: "Electricity, water and internet" });
    entries.push({ daysBack: back - 5, category: "Salaries", amount: 285000, vendor: "Payroll", paymentMethod: "bank_transfer", tags: ["payroll"], description: "Staff salaries" });
  }
  for (let i = 0; i < 8; i += 1) {
    entries.push({ daysBack: int(1, SEED_DAYS - 1), category: "Marketing", amount: int(5000, 25000), vendor: pick(["Facebook Ads", "Google Ads", "Leaflet Press", "Billboard Co."]), paymentMethod: "card", tags: ["ads"], description: "Advertising campaign" });
  }
  for (let i = 0; i < 12; i += 1) {
    entries.push({ daysBack: int(1, SEED_DAYS - 1), category: "Shipping", amount: int(300, 1500), vendor: "Steadfast", paymentMethod: pick(["cash", "mobile_banking"]), tags: ["delivery"], description: "Customer delivery" });
  }
  for (let i = 0; i < 8; i += 1) {
    entries.push({ daysBack: int(1, SEED_DAYS - 1), category: "Packaging", amount: int(1500, 6500), vendor: "PackCo Supplies", paymentMethod: "cash", tags: ["supplies"], description: "Bags, boxes and wrap" });
  }
  for (let i = 0; i < 3; i += 1) {
    entries.push({ daysBack: int(1, SEED_DAYS - 1), category: "Equipment", amount: int(15000, 45000), vendor: pick(["BD Office Mart", "FixIt Services"]), paymentMethod: pick(["bank_transfer", "card"]), tags: ["asset"], description: "Shop equipment and fixtures" });
  }
  for (let i = 0; i < 5; i += 1) {
    entries.push({ daysBack: int(1, SEED_DAYS - 1), category: "Miscellaneous", amount: int(500, 4000), vendor: "Various", paymentMethod: "cash", tags: [], description: "Miscellaneous store expense" });
  }

  entries.sort((a, b) => a.daysBack - b.daysBack);

  let receiptSeq = 1;
  let created = 0;
  let equipmentLinked = false;
  for (const entry of entries) {
    const date = daysAgo(entry.daysBack);
    date.setHours(int(9, 18), int(0, 59), 0, 0);

    const linkedPo =
      !equipmentLinked && entry.category === "Equipment" && purchaseOrderDocs.length > 0
        ? purchaseOrderDocs[0]
        : null;
    if (linkedPo) equipmentLinked = true;

    await expenseRepository.createExpense({
      categoryId: categoryIds.get(entry.category),
      amount: entry.amount,
      description: entry.description,
      date,
      paymentMethod: entry.paymentMethod,
      vendor: entry.vendor,
      receiptNumber: `INV-${dateStamp(date)}-${String(receiptSeq).padStart(3, "0")}`,
      tags: entry.tags,
      referenceId: linkedPo ? linkedPo._id : null,
      referenceType: linkedPo ? "purchase_order" : "none",
      createdBy: adminId,
      createdAt: date,
    });
    receiptSeq += 1;
    created += 1;
  }
  return created;
}

async function wipeOperationalData() {
  let orders = 0;
  for (const order of await orderRepository.findAll()) {
    await orderRepository.deleteById(order._id);
    orders += 1;
  }
  let movements = 0;
  for (const movement of await stockMovementRepository.findAll()) {
    await stockMovementRepository.deleteById(movement._id);
    movements += 1;
  }
  let purchaseOrders = 0;
  for (const po of await purchaseOrderRepository.findAll()) {
    await purchaseOrderRepository.deleteById(po._id);
    purchaseOrders += 1;
  }
  let expenses = 0;
  for (const expense of await expenseRepository.findAll()) {
    await expenseRepository.deleteById(expense._id);
    expenses += 1;
  }
  let reviews = 0;
  for (const review of await reviewRepository.findAll()) {
    await reviewRepository.deleteById(review._id);
    reviews += 1;
  }

  const products = await productRepository.findAll();
  for (const seed of PRODUCTS) {
    const product = products.find((p) => p.name === seed.name);
    if (product) {
      await productRepository.updateById(product._id, { stock: seed.stock });
    }
  }

  console.log(
    `Wiped: ${orders} orders, ${movements} movements, ${purchaseOrders} purchase orders, ${expenses} expenses, ${reviews} reviews.`,
  );
}

async function ensureSettings() {
  const settings = await settingsRepository.getSettings();
  const patch = {};
  if (settings.reviewsEnabled !== true) patch.reviewsEnabled = true;
  if (settings.inventoryManagementEnabled !== true) patch.inventoryManagementEnabled = true;
  if (settings.orderProcessingEnabled !== true) patch.orderProcessingEnabled = true;
  if (Object.keys(patch).length > 0) {
    await settingsRepository.updateSettings(patch);
  }
}

async function seedTemplates() {
  const existing = await receiptTemplateRepository.getAllActive();
  const names = new Set(existing.map((t) => t.name));
  for (const def of DEFAULT_RECEIPT_TEMPLATES) {
    if (!names.has(def.name)) {
      await receiptTemplateRepository.createTemplate(def, "system");
      console.log(`Created default template: ${def.name}`);
    }
  }
  console.log("Receipt templates ready");
}

function printAdminSummary(admin) {
  console.log("");
  if (admin.created) {
    console.log("Admin account created.");
    console.log(`  email:    ${ADMIN_EMAIL}`);
    if (ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
      console.log(`  password: ${ADMIN_PASSWORD}  <- built-in default, change it`);
    } else {
      console.log("  password: (the value of SEED_ADMIN_PASSWORD)");
    }
    console.log("  Sign in at /admin/login on the storefront.");
  } else if (admin.repaired) {
    const changes = Object.keys(admin.repaired);
    console.log(`Admin account repaired: ${changes.join(", ")} reset on ${admin.email}.`);
    if (admin.repaired.password) {
      console.log(
        ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD
          ? `  password: ${ADMIN_PASSWORD}  <- built-in default, change it`
          : "  password: (the value of SEED_ADMIN_PASSWORD)",
      );
    }
  } else {
    console.log(`Admin account already exists: ${admin.email}`);
  }
}

async function main() {
  console.log(
    `Unified seeder: ${DEMO_MODE ? "demo (uploads)" : "standard"} catalogue, ` +
      `${SEED_DAYS}-day history${FORCE ? ", force" : ""}` +
      `${CATALOGUE_ONLY ? ", catalogue only" : ""}`,
  );

  const admin = await ensureAdmin();
  printAdminSummary(admin);
  const adminUser = await userRepository.findOne(
    (u) => String(u.email).toLowerCase() === ADMIN_EMAIL,
  );

  const products = DEMO_MODE
    ? await seedDemoCatalogue()
    : await seedStandardCatalogue();

  await seedTemplates();

  if (products.length === 0) {
    console.log("No products available — skipping history seeding.");
    return;
  }

  if (CATALOGUE_ONLY) {
    console.log("Catalogue-only mode: skipping the detailed history.");
    return;
  }

  const shoppers = await ensureShoppers();
  console.log(`Shopper accounts ready: ${shoppers.length}`);

  if (FORCE) {
    await wipeOperationalData();
  }

  await ensureSettings();

  const reviews = await seedReviews(products);
  console.log(`Reviews created: ${reviews}`);

  const {
    orders,
    purchaseOrders,
    movements,
    docs: purchaseOrderDocs,
  } = await seedHistory(adminUser._id, shoppers);
  console.log(
    `Orders created: ${orders}, purchase orders: ${purchaseOrders} (${movements} stock movements)`,
  );

  const expenses = await seedExpenses(adminUser._id, purchaseOrderDocs);
  console.log(`Expenses created: ${expenses}`);

  console.log("");
  console.log("Seed complete.");
}

assertProductionSafety();

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
