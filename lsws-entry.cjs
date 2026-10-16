(async () => {
  try {
    await import("./server.js");
  } catch (err) {
    console.error("LSWS bootstrap failed:", err);
    process.exit(1);
  }
})();
