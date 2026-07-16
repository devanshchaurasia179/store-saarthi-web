import Customer from "../models/Customer.js";
import mongoose from "mongoose";

/**
 * CREATE CUSTOMER / SUPPLIER
 * POST /api/customers
 */
export async function createCustomer(req, res) {
  try {
    const shopId = req.user._id;
    const { name, mobileNumber, isSupplier = false } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    let finalMobileNumber = mobileNumber?.trim();

    // 1️⃣ If mobile number NOT provided → generate fallback
    if (!finalMobileNumber) {
      finalMobileNumber = new mongoose.Types.ObjectId()
        .toString()
        .slice(-8);
    }

    // 2️⃣ Prevent duplicate for same shop + mobile
    const existingCustomer = await Customer.findOne({
      shopId,
      mobileNumber: finalMobileNumber,
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer already exists",
      });
    }

    // 3️⃣ Create customer / supplier
    const customer = await Customer.create({
      shopId,
      name: name.trim(),
      mobileNumber: finalMobileNumber,
      isSupplier,          // ✅ NEW FIELD
      totalPending: 0,
    });

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Create Customer Error:", error);

    // 🔐 Handle duplicate index error (extra safety)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Customer with this mobile number already exists",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * GET ALL CUSTOMERS / SUPPLIERS
 * GET /api/customers
 */
export async function getCustomers(req, res) {
  try {
    const shopId = req.user._id;

    const customers = await Customer.find({ shopId })
      .sort({ totalPending: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Get Customers Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * GET SINGLE CUSTOMER / SUPPLIER
 * GET /api/customers/:customerId
 */
export async function getCustomerById(req, res) {
  try {
    const shopId = req.user._id;
    const { customerId } = req.params;

    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get Customer Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
// UPDATE CUSTOMER
export async function updateCustomer(req, res) {
  try {
    const shopId = req.user._id;
    const { customerId } = req.params;
    const { name, mobileNumber } = req.body;

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, shopId },
      { name, mobileNumber },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ success: true, customer });
  } catch (e) {
    res.status(500).json({ message: "Update failed" });
  }
}
