import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  categoryRepository,
  productRepository,
  userRepository,
  reviewRepository,
  receiptTemplateRepository,
} from "../models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "processed");
const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
]);

// List image files in a directory, sorted with natural numeric ordering.
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

const FORCE = process.argv.includes("--force");
const RESET_PASSWORD = process.argv.includes("--reset-password");

const DEFAULT_ADMIN_EMAIL = "admin@atozkids.world";
const DEFAULT_ADMIN_PASSWORD = "admin12345";

const ADMIN_EMAIL = (
  process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
).toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Store Admin";

// A repository-committed password is fine on a laptop and unacceptable on a
// deployed host, so refuse the defaults outright in production.
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

const CATEGORIES = [
  { name: "Building blocks", icon: "🧱", description: "Construct, stack and rebuild all day long." },
  { name: "Arts & crafts", icon: "🎨", description: "Colour, glue, clay and creative mess." },
  { name: "Outdoor play", icon: "🏕️", description: "Fresh air, big energy and muddy knees." },
  { name: "STEM toys", icon: "🤖", description: "Experiments, circuits and curious minds." },
  { name: "Board games", icon: "🎲", description: "Tabletop adventures for the whole family." },
  { name: "Plush friends", icon: "🧸", description: "Soft, squeezable, forever friends." },
  { name: "Puzzles", icon: "🧩", description: "Quiet focus with a satisfying finish." },
];

const PRODUCTS = [
  ["Rainbow Builder Set", "Building blocks", 3499, 2099, 24, "Ages 4–8", "42 colourful wooden pieces", "Colourful wooden blocks for building big ideas and tiny worlds.", "photo-1594784053337-5b3a7f0d0b1d"],
  ["Magnetic Tiles 60pc", "Building blocks", 4999, 2999, 18, "Ages 3–7", "60 magnetic tiles in 6 shapes", "Endless magnetic construction fun – build castles, cars and more.", "photo-1587654780291-39c9404d9f5e"],
  ["Giant Foam Building Set", "Building blocks", 5999, 3599, 12, "Ages 2–6", "28 oversized foam blocks", "Oversized soft foam blocks for safe, endless architectural adventures.", "photo-1594784053337-5b3a7f0d0b1d"],

  ["Little Artist Easel", "Arts & crafts", 4999, 2999, 15, "Ages 3–9", "Double-sided easel and art tray", "A sturdy creative station for painting, doodling and showing off.", "photo-1561214115-f2f134cc4912"],
  ["Clay & Sculpting Kit", "Arts & crafts", 2499, 1499, 30, "Ages 5–12", "8 clay colours + 5 sculpting tools", "Air-dry clay, tools and inspiration – mould your own mini masterpieces.", "photo-1561214115-f2f134cc4912"],
  ["Rainbow Loom Kit", "Arts & crafts", 1899, 1139, 40, "Ages 6–12", "600 rubber bands + 2 looms", "Weave colourful bracelets, charms and accessories with endless patterns.", "photo-1561214115-f2f134cc4912"],

  ["Dino Discovery Kit", "Outdoor play", 2499, 1499, 20, "Ages 5–10", "Fossil tools and discovery guide", "A friendly fossil-hunting adventure for curious explorers.", "photo-1596464716127-f2a82984de30"],
  ["Glow-in-the-Dark Catch Set", "Outdoor play", 1999, 1199, 25, "Ages 4–9", "2 glow balls + catching mitt", "Two glow-in-the-dark balls and a catching mitt for evening fun.", "photo-1596464716127-f2a82984de30"],
  ["Adventure Explorer Vest", "Outdoor play", 3499, 2099, 16, "Ages 5–10", "Multi-pocket adventure vest", "A safari-ready vest with pockets for all your outdoor discoveries.", "photo-1596464716127-f2a82984de30"],

  ["Mini Science Lab", "STEM toys", 2999, 1799, 22, "Ages 6–12", "12 safe science experiments", "Hands-on experiments that make big science feel wonderfully small.", "photo-1532094349884-543bc11b234d"],
  ["Robot Coding Lab", "STEM toys", 5999, 3599, 10, "Ages 8–14", "Robot parts + coding guide", "Build and code your own robot while learning logic and problem-solving.", "photo-1532094349884-543bc11b234d"],
  ["Circuit Explorer Set", "STEM toys", 3999, 2399, 18, "Ages 7–12", "20 circuit components + guide", "Snap-together circuits that light up, buzz and spin – no soldering required.", "photo-1532094349884-543bc11b234d"],

  ["Storytime Board Game", "Board games", 1899, 1139, 28, "Ages 5–9", "Game board and 48 story cards", "A cooperative game where every turn adds a new chapter to the story.", "photo-1610890716171-6b1bb98ffd09"],
  ["Pirate Treasure Match", "Board games", 1999, 1199, 26, "Ages 5–10", "Game board + 36 treasure tokens", "Memory and strategy with a pirate twist – find the treasure first.", "photo-1610890716171-6b1bb98ffd09"],
  ["Fruit Forest Adventure", "Board games", 2999, 1799, 14, "Ages 4–8", "Board + 60 forest cards", "A cooperative game where you work together to save the enchanted forest.", "photo-1610890716171-6b1bb98ffd09"],

  ["Cuddle Cloud Bear", "Plush friends", 1599, 959, 35, "Ages 2+", "One extra-soft plush friend", "A soft, huggable companion for naps, trips and storytime.", "photo-1559454403-b8fb88521f11"],
  ["Unicorn Plush Pillow", "Plush friends", 2999, 1799, 19, "All ages", "One plush unicorn pillow", "A magical unicorn that doubles as a comfy pillow – dreamy!", "photo-1559454403-b8fb88521f11"],
  ["Snuggle Sloth Buddy", "Plush friends", 1999, 1199, 27, "Ages 3+", "One soft sloth plush (18 inches)", "Super soft, huggable sloth with long cuddly arms.", "photo-1559454403-b8fb88521f11"],

  ["Ocean Quest Puzzle", "Puzzles", 1299, 779, 45, "Ages 4–7", "60 sturdy puzzle pieces", "A colourful ocean scene that makes quiet focus feel like an adventure.", "photo-1606503153255-59d8b8b3d2e6"],
  ["Solar System Floor Puzzle", "Puzzles", 2499, 1499, 21, "Ages 6–10", "48 giant puzzle pieces", "A giant 48-piece puzzle of the planets – educational and fun.", "photo-1606503153255-59d8b8b3d2e6"],
  ["Jungle Animals 100pc Puzzle", "Puzzles", 1599, 959, 23, "Ages 5–9", "100 precision-cut puzzle pieces", "A vibrant jungle scene with 100 pieces – hours of engaging fun.", "photo-1606503153255-59d8b8b3d2e6"],
].map(([name, category, price, buyPrice, stock, age, includes, description, imageId]) => ({
  name,
  category,
  price,
  buyPrice,
  stock,
  age,
  includes,
  description,
  imageId,
}));

const REVIEW_AUTHORS = [
  "Nadia", "Rahim", "Priya", "Tomas", "Aisha", "Chen", "Bilal", "Elena",
  "Farhan", "Mei", "Jonah", "Sofia",
];

const REVIEW_COMMENTS = [
  "Arrived quickly and the packaging was lovely.",
  "My child has not put it down since it arrived.",
  "Good quality for the price, would buy again.",
  "Exactly as pictured, very happy with the purchase.",
  "A little smaller than expected but still lovely.",
  "Perfect birthday gift and it survived the first week.",
  "Great little gift, the quality feels premium.",
  "Kept my two busy for a whole rainy afternoon.",
];

function reviewFor(productId, index) {
  const rating = [5, 5, 4, 5, 4, 3, 5, 4][index % 8];
  return {
    productId,
    name: REVIEW_AUTHORS[index % REVIEW_AUTHORS.length],
    rating,
    comment: REVIEW_COMMENTS[index % REVIEW_COMMENTS.length],
  };
}

async function seedAdmin() {
  const existing = await userRepository.findOne(
    (u) => String(u.email).toLowerCase() === ADMIN_EMAIL,
  );

  if (existing) {
    // Recovery path. If the account lost its Admin role there is no way back
    // through the API — the staff area is unreachable and the only-admin guard
    // will not help, because it protects the last Admin from being demoted
    // rather than from already being demoted. Repair it here.
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

async function main() {
  const existingCategories = await categoryRepository.findAll();
  const existingProducts = await productRepository.findAll();

  if ((existingCategories.length || existingProducts.length) && !FORCE) {
    console.log(
      `Catalogue already seeded: found ${existingCategories.length} categories and ${existingProducts.length} products. Nothing to do.`,
    );
  } else {
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

    const createdProducts = [];
    for (let i = 0; i < PRODUCTS.length; i += 1) {
      const seed = PRODUCTS[i];
      const categoryId = categoryIds.get(seed.category);
      if (!categoryId) continue;

      const image =
        uploads.length > 0
          ? `/uploads/${uploads[i % uploads.length]}`
          : `https://images.unsplash.com/${seed.imageId}?auto=format&fit=crop&w=700&q=80`;

      // Generate SKU from name: uppercase, replace non-alphanumeric with dash, truncate
      const sku = seed.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);

      const existing = existingProducts.find(
        (p) => p.name.toLowerCase() === seed.name.toLowerCase(),
      );
      const product =
        existing ||
        (await productRepository.createProduct({
          name: seed.name,
          description: seed.description,
          price: seed.price,
          buyPrice: seed.buyPrice,
          stock: seed.stock,
          sku,
          categoryId,
          image,
          details: { age: seed.age, includes: seed.includes },
        }));
      createdProducts.push(product);
    }
    console.log(`Products ready: ${createdProducts.length}`);

    const existingReviews = await reviewRepository.findAll();
    let reviewCount = 0;
    for (const product of createdProducts) {
      const has = existingReviews.some(
        (r) => String(r.productId) === String(product._id),
      );
      if (has) continue;
      for (let i = 0; i < 3; i += 1) {
        await reviewRepository.createReview(reviewFor(product._id, i + reviewCount));
        reviewCount += 1;
      }
    }
    console.log(`Reviews created: ${reviewCount}`);
  }

  const admin = await seedAdmin();
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

  // Seed default receipt templates
  await seedTemplates();
}

async function seedTemplates() {
  const existing = await receiptTemplateRepository.getAllActive();
  const names = new Set(existing.map(t => t.name));

  const defaults = [
    {
      _id: "pos-thermal",
      name: "pos-thermal",
      version: 1,
      header_html: `<div class="receipt-header center">
  <p class="bold text-[14px]">{{companyName}}</p>
  <p class="text-[11px] text-gray-600">{{companyAddress}}</p>
  <p class="text-[11px] text-gray-600">{{companyPhone}}</p>
</div>`,
      footer_html: `<div class="receipt-footer center text-[11px] text-gray-600 mt-3">
  <p class="bold">Thank you for shopping with us!</p>
  <p class="mt-1">Goods sold are not returnable</p>
  <p class="mt-1">without receipt within 7 days</p>
  <div class="mt-3 text-[10px] text-gray-500">
    <p>Powered by A to Z Kids World POS</p>
  </div>
</div>`,
      body_template: `<div class="receipt-body">
  <div class="sale-info">
    <p><span class="bold">Sale #:</span> {{saleNumber}}</p>
    <p><span class="bold">Date:</span> {{date}}</p>
    <p><span class="bold">Cashier:</span> {{cashier}}</p>
    {{#if customerName}}
    <p><span class="bold">Customer:</span> {{customerName}}</p>
    {{/if}}
    {{#if customerPhone}}
    <p><span class="bold">Phone:</span> {{customerPhone}}</p>
    {{/if}}
    {{#if customerEmail}}
    <p><span class="bold">Email:</span> {{customerEmail}}</p>
    {{/if}}
    {{#if customerAddress}}
    <p><span class="bold">Address:</span> {{customerAddress}}</p>
    {{/if}}
    <p><span class="bold">Payment:</span> {{paymentMethod}}</p>
    {{#if discount}}
    <p class="discount"><span class="bold">Discount:</span> -{{formatBDT discount}} {{#if discountType}}{{#if discountValue}}({{discountValue}}%){{/if}}{{/if}}</p>
    {{/if}}
    {{#if balance}}
    <p class="balance"><span class="bold">Balance:</span> {{formatBDT balance}}</p>
    {{/if}}
  </div>

  <div class="line" />

  <div class="items">
    <div class="flex justify-between text-[11px] bold mb-1">
      <span class="item-name">Item</span>
      <span class="item-qty-price">Qty × Price</span>
    </div>
    {{#each items}}
    <div class="item-row">
      <span class="item-name text-[11px]">{{name}}</span>
      <span class="item-qty-price text-[11px]">{{quantity}} × {{formatBDT price}}</span>
    </div>
    {{/each}}
  </div>

  <div class="line" />

  <div class="totals">
    <div class="row text-[12px]">
      <span>Subtotal</span>
      <span class="bold">{{formatBDT subtotal}}</span>
    </div>
    {{#if discount}}
    <div class="row text-[12px] text-red-600">
      <span>Discount {{#if discountType}}{{#if discountValue}}({{discountValue}}%){{/if}}{{/if}}</span>
      <span class="bold">-{{formatBDT discount}}</span>
    </div>
    {{/if}}
    {{#if tax}}
    <div class="row text-[12px]">
      <span>Tax</span>
      <span class="bold">{{formatBDT tax}}</span>
    </div>
    {{/if}}
    <div class="row text-[13px] bold mt-1">
      <span>TOTAL</span>
      <span>{{formatBDT total}}</span>
    </div>
    {{#if amountPaid}}
    {{#if amountPaidNotEqualTotal}}
    <div class="row text-[12px] mt-1">
      <span>Paid</span>
      <span class="bold">{{formatBDT amountPaid}}</span>
    </div>
    {{/if}}
    {{/if}}
    {{#if change}}
    <div class="row text-[12px] text-green-600">
      <span>Change</span>
      <span class="bold">{{formatBDT change}}</span>
    </div>
    {{/if}}
    {{#if balance}}
    <div class="row text-[12px] text-accent-700">
      <span>Balance (Due)</span>
      <span class="bold">{{formatBDT balance}}</span>
    </div>
    {{/if}}
    {{#if debtRepayment}}
    <div class="row text-[12px] text-green-700">
      <span>Debt Paid</span>
      <span class="bold">-{{formatBDT debtRepayment}}</span>
    </div>
    {{/if}}
  </div>
</div>`,
      css_styles: `@media print {
  @page { margin: 0; size: 80mm auto; }
  body { margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; width: 320px; margin: 0 auto; padding: 16px; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 8px 0; }
.row { display: flex; justify-content: space-between; margin: 4px 0; }
.items { font-size: 11px; }
.item-row { display: flex; justify-content: space-between; margin: 2px 0; }
.item-name { width: 65%; word-break: break-word; }
.item-qty-price { width: 35%; text-align: right; }
.discount { color: #dc2626; }
.balance { color: #f97316; }`,
      is_active: true,
    },
    {
      _id: "a4-standard",
      name: "a4-standard",
      version: 1,
      header_html: `<div class="receipt-header header">
  <div class="company-name">{{companyName}}</div>
  <div class="company-info">
    <p>{{companyAddress}}</p>
    <p>Tel: {{companyPhone}} | Email: {{companyEmail}}</p>
  </div>
</div>`,
      footer_html: `<div class="receipt-footer footer">
  <p class="thank-you">Thank you for shopping with us!</p>
  <p class="policy">Goods sold are not returnable without receipt within 7 days</p>
  <p class="policy mt-4">Powered by A to Z Kids World POS</p>
</div>`,
      body_template: `<div class="receipt-body">
  <div class="sale-info">
    <div>
      <p><span class="label">Sale Number:</span> <span class="value">{{saleNumber}}</span></p>
      <p><span class="label">Date:</span> <span class="value">{{date}}</span></p>
    </div>
    <div>
      <p><span class="label">Cashier:</span> <span class="value">{{cashier}}</span></p>
      <p><span class="label">Payment Method:</span> <span class="value">{{paymentMethod}}</span></p>
    </div>
    {{#if customerName}}
    <div>
      <p><span class="label">Customer:</span> <span class="value">{{customerName}}</span></p>
      <p><span class="label">Phone:</span> <span class="value">{{customerPhone}}</span></p>
      {{#if customerEmail}}
      <p><span class="label">Email:</span> <span class="value">{{customerEmail}}</span></p>
      {{/if}}
      {{#if customerAddress}}
      <p><span class="label">Address:</span> <span class="value">{{customerAddress}}</span></p>
      {{/if}}
    </div>
    {{/if}}
  </div>

  <table class="items-table" role="table">
    <thead>
      <tr>
        <th style="width: 50%">Item</th>
        <th class="text-center" style="width: 12%">Qty</th>
        <th class="text-right" style="width: 18%">Unit Price</th>
        <th class="text-right" style="width: 20%">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}</td>
        <td class="text-center">{{quantity}}</td>
        <td class="text-right">{{formatBDT price}}</td>
        <td class="text-right font-medium">{{formatBDT (multiply price quantity)}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>{{formatBDT subtotal}}</span>
    </div>
    {{#if discount}}
    <div class="row text-red-600">
      <span>Discount {{#if discountType}}{{#if discountValue}}({{discountValue}}%){{/if}}{{/if}}</span>
      <span>-{{formatBDT discount}}</span>
    </div>
    {{/if}}
    {{#if tax}}
    <div class="row">
      <span>Tax</span>
      <span>{{formatBDT tax}}</span>
    </div>
    {{/if}}
    <div class="row total">
      <span>TOTAL</span>
      <span>{{formatBDT total}}</span>
    </div>
    {{#if amountPaid}}
    {{#if amountPaidNotEqualTotal}}
    <div class="row">
      <span>Amount Paid</span>
      <span>{{formatBDT amountPaid}}</span>
    </div>
    {{/if}}
    {{/if}}
    {{#if balance}}
    <div class="row text-accent-600">
      <span>Balance (Due)</span>
      <span class="font-bold">{{formatBDT balance}}</span>
    </div>
    {{/if}}
    {{#if debtRepayment}}
    <div class="row text-green-600">
      <span>Debt Repayment</span>
      <span class="font-bold">-{{formatBDT debtRepayment}}</span>
    </div>
    {{/if}}
  </div>
</div>`,
      css_styles: `@media print {
  @page { margin: 20mm; size: A4; }
  body { margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a; max-width: 210mm; margin: 0 auto; padding: 20mm; }
.header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 24px; }
.company-name { font-size: 28px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }
.company-info { font-size: 13px; color: #666; line-height: 1.6; }
.sale-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; font-size: 13px; }
.sale-info .label { font-weight: 600; color: #666; }
.sale-info .value { font-weight: 500; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
.items-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #1a1a1a; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
.items-table td { padding: 10px 8px; border-bottom: 1px solid #eee; }
.items-table tr:last-child td { border-bottom: 2px solid #1a1a1a; }
.items-table .text-right { text-align: right; }
.items-table .text-center { text-align: center; }
.totals { width: 300px; margin-left: auto; font-size: 13px; }
.totals .row { display: flex; justify-content: space-between; padding: 6px 0; }
.totals .row.total { font-size: 16px; font-weight: 800; border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px; }
.footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
.footer .thank-you { font-weight: 700; font-size: 16px; color: #1a1a1a; margin-bottom: 8px; }
.policy { font-size: 11px; color: #999; margin-top: 16px; }`,
      is_active: true,
    },
  ];

  for (const def of defaults) {
    if (!names.has(def.name)) {
      await receiptTemplateRepository.createTemplate(def, "system");
      console.log(`Created default template: ${def.name}`);
    }
  }
  console.log("Receipt templates ready");
}

assertProductionSafety();

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
