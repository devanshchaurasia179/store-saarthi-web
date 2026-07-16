import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addDebit,
  addCredit,
  getCustomerLedger,
} from "../controllers/ledger.controller.js";
import { updateCustomer } from "../controllers/customer.controller.js";
const router = express.Router();



// ADD BILL TO LEDGER (DEBIT)
router.post("/debit", protectRoute, addDebit);

// ADD PAYMENT (CREDIT)
router.post("/credit", protectRoute, addCredit);

// GET LEDGER FOR A CUSTOMER
router.get("/customer/:customerId", protectRoute, getCustomerLedger);

export default router;
