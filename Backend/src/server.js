import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import ledgerRoutes from "./routes/ledger.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import productRoutes from "./routes/product.routes.js";
import billRoutes from "./routes/bill.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import printRoutes from "./routes/print.routes.js";
import publicRoutes from "./routes/public.routes.js";
import customerAuthRoutes from "./routes/customerAuth.routes.js";
import orderRoutes from "./routes/order.routes.js";
import shopOrderRoutes from "./routes/shopOrder.routes.js";
import { initBillCleanupScheduler } from "./config/billCleanupScheduler.js";

dotenv.config();
import dns from 'dns';
// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const app = express();
const PORT = process.env.PORT || 5000;


const __dirname = path.resolve();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

  
  app.use(express.json());
  app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/dashboard", dashboardRoutes);
// ...
app.use("/api/analytics", analyticsRoutes);
app.use("/api/print", printRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/customer-auth", customerAuthRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shop/orders", shopOrderRoutes);




app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

connectDB();

// Initialize bill cleanup scheduler
initBillCleanupScheduler();

app.listen(PORT,"0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});