// Shared catalogue seed data, used by both the basic seeder
// (scripts/seed.js) and the detailed seeder (scripts/seedDetailed.js).

const CATEGORIES = [
  { name: "Building blocks", icon: "🧱", description: "Construct, stack and rebuild all day long." },
  { name: "Arts & crafts", icon: "🎨", description: "Colour, glue, clay and creative mess." },
  { name: "Outdoor play", icon: "🏕️", description: "Fresh air, big energy and muddy knees." },
  { name: "STEM toys", icon: "🤖", description: "Experiments, circuits and curious minds." },
  { name: "Board games", icon: "🎲", description: "Tabletop adventures for the whole family." },
  { name: "Plush friends", icon: "🧸", description: "Soft, squeezable, forever friends." },
  { name: "Puzzles", icon: "🧩", description: "Quiet focus with a satisfying finish." },
];

// [name, category, price, buyPrice, stock, age, includes, description, imageId]
const PRODUCT_SEEDS = [
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
];

const PRODUCTS = PRODUCT_SEEDS.map(
  ([name, category, price, buyPrice, stock, age, includes, description, imageId]) => ({
    name,
    category,
    price,
    buyPrice,
    stock,
    age,
    includes,
    description,
    imageId,
  }),
);

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

export { CATEGORIES, PRODUCTS, REVIEW_AUTHORS, REVIEW_COMMENTS, reviewFor };
