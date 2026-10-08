import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  categoryRepository,
  productRepository,
  userRepository,
  reviewRepository,
} from "../models/index.js";

// Demo seeder: builds catalogue entries from whatever images sit in the
// upload folder. Images are used as-is — no analysis, no categorisation
// by content; products are spread round-robin across the standard
// categories with generated copy.

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
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const FORCE = process.argv.includes("--force");
const RESET_PASSWORD = process.argv.includes("--reset-password");

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

const CATEGORIES = [
  { name: "Building blocks", icon: "🧱", description: "Construct, stack and rebuild all day long." },
  { name: "Arts & crafts", icon: "🎨", description: "Colour, glue, clay and creative mess." },
  { name: "Outdoor play", icon: "🏕️", description: "Fresh air, big energy and muddy knees." },
  { name: "STEM toys", icon: "🤖", description: "Experiments, circuits and curious minds." },
  { name: "Board games", icon: "🎲", description: "Tabletop adventures for the whole family." },
  { name: "Plush friends", icon: "🧸", description: "Soft, squeezable, forever friends." },
  { name: "Puzzles", icon: "🧩", description: "Quiet focus with a satisfying finish." },
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

// The served upload folder is the source of truth, but on a fresh checkout
// it may be empty while the original uploads still sit in DriveDownloads —
// copy them across so the demo is self-contained.
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
  const images = ensureUploadImages();
  if (images.length === 0) {
    console.log(
      `No images found in uploads/processed (or the DriveDownloads source). Nothing to seed.`,
    );
    return;
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

  // Re-read after any removal so we never reuse stale _id references.
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
}

assertProductionSafety();

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
