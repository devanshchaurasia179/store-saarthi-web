/**
 * src/routes/print.routes.js
 *
 *   POST /api/print/test          — test receipt (no auth)
 *   POST /api/print/bill/:billId  — print existing bill by ID (auth required)
 */

import { Router }                    from "express";
import { protectRoute }              from "../middleware/auth.middleware.js";
import { printTest, printBillById }  from "../controllers/print.controller.js";

const router = Router();

// Quick smoke test — no auth needed
router.post("/test", printTest);

// Print a saved bill — must be logged in so we know which shop owns the bill
router.post("/bill/:billId", protectRoute, printBillById);

export default router;
