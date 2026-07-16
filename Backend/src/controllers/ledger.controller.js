import LedgerEntry from "../models/LedgerEntry.js";
import Customer from "../models/Customer.js";

/**
 * ADD DEBIT (Bill added to Khata)
 * POST /api/ledger/debit
 */
export async function addDebit(req, res) {
  try {
    const shopId = req.user._id;
    const { customerId, amount, billId, note } = req.body;

    if (!customerId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "customerId and valid amount are required",
      });
    }

    const customer = await Customer.findOne({ _id: customerId, shopId });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create ledger entry
    const entry = await LedgerEntry.create({
      shopId,
      customerId,
      type: "DEBIT",
      amount,
      billId,
      note: note || "Bill added",
    });

    // ✅ Debit increases pending (can reduce advance)
    customer.totalPending += amount;
    await customer.save();

    res.status(201).json({
      success: true,
      ledgerEntry: entry,
      balance: {
        totalPending: customer.totalPending,
      },
    });
  } catch (error) {
    console.error("Add Debit Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * ADD CREDIT (Customer payment / Advance)
 * POST /api/ledger/credit
 */
export async function addCredit(req, res) {
  try {
    const shopId = req.user._id;
    const { customerId, amount, note } = req.body;

    if (!customerId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "customerId and valid amount are required",
      });
    }

    const customer = await Customer.findOne({ _id: customerId, shopId });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create ledger entry
    const entry = await LedgerEntry.create({
      shopId,
      customerId,
      type: "CREDIT",
      amount,
      note: note || "Payment received",
    });

    // ✅ Credit reduces pending (can go NEGATIVE = advance)
    customer.totalPending -= amount;
    await customer.save();

    res.status(201).json({
      success: true,
      ledgerEntry: entry,
      balance: {
        totalPending: customer.totalPending,
      },
    });
  } catch (error) {
    console.error("Add Credit Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * GET LEDGER FOR CUSTOMER
 * GET /api/ledger/customer/:customerId
 */
export async function getCustomerLedger(req, res) {
  try {
    const shopId = req.user._id;
    const { customerId } = req.params;

    const customer = await Customer.findOne({ _id: customerId, shopId });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const entries = await LedgerEntry.find({
      shopId,
      customerId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        totalPending: customer.totalPending,
        isSupplier: customer.isSupplier,
        balanceType:
          customer.totalPending > 0
            ? "DUE"
            : customer.totalPending < 0
            ? "ADVANCE"
            : "SETTLED",
        advanceAmount:
          customer.totalPending < 0 ? Math.abs(customer.totalPending) : 0,
      },
      entries,
    });
  } catch (error) {
    console.error("Get Ledger Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
