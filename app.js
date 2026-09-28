import express from "express";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "a-to-z-toys API is running" });
});

app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use("/reviews", reviewRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});