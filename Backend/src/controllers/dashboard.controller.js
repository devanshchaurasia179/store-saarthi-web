import Product from "../models/Product.js";
import Bill from "../models/Bill.js";
import Customer from "../models/Customer.js";
import { DASHBOARD_UPDATE_CONFIG } from "../config/dashboardUpdateConfig.js";
import { decrypt } from "../utils/encrypt.js";

/* -------------------------------
   ENCRYPTED FIELDS (bill)
-------------------------------- */
const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];

function decryptBill(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject({ virtuals: true }) : { ...doc };
  for (const field of ENCRYPTED_FIELDS) {
    if (obj[field] !== undefined && obj[field] !== null) {
      obj[field] = decrypt(obj[field]);
    }
  }
  return obj;
}

/* -------------------------------
   PROFILE COMPLETION
-------------------------------- */
function calculateProfileCompletion(shop) {
  let score = 0;
  if (shop.shopName) score += 20;
  if (shop.ownerName) score += 20;
  if (shop.storeCategory) score += 20;
  if (shop.upiId) score += 20;
  if (shop.address && (shop.address.street || shop.address.city)) score += 20;
  return score;
}

/* -------------------------------
   GET DASHBOARD
-------------------------------- */
export async function getDashboard(req, res) {
  try {
    const shop = req.user;
    const shopId = shop._id;

    /* -------------------------------
       PROFILE
    -------------------------------- */
    const profileCompletion = calculateProfileCompletion(shop);

    /* -------------------------------
       🆕 DASHBOARD-CONTROLLED UPDATE
       (FILE BASED – SAFE)
    -------------------------------- */
    const {
      updateAvailable,
      updateMessage,
      latestVersion,
      forceUpdate,
      playStoreUrl,
    } = DASHBOARD_UPDATE_CONFIG;

    /* -------------------------------
       ✅ TOP DEBTOR (CUSTOMERS ONLY)
    -------------------------------- */
    const topDebtor = await Customer.findOne({
      shopId,
      isSupplier: { $ne: true }, // ✅ CRITICAL FIX
      totalPending: { $gt: 0 },
    })
      .sort({ totalPending: -1 })
      .select("_id name totalPending mobileNumber isSupplier");

    /* -------------------------------
       LOW STOCK (trackable only)
       🆕 INCLUDE UNIT
    -------------------------------- */
    const lowStock = await Product.find({
      shopId,
      isActive: true,
      isTrackable: true,
      quantity: { $lte: 5 },
    })
      .limit(5)
      .select("name quantity unit");

    /* -------------------------------
       MOST SOLD PRODUCTS
       (aggregation can't unwind encrypted items —
        fetch recent bills and aggregate in JS instead)
    -------------------------------- */
    const billsForMostSold = await Bill.find({ shopId })
      .sort({ createdAt: -1 })
      .limit(200)
      .select("items")
      .lean();

    const soldMap = {};
    for (const rawBill of billsForMostSold) {
      const decrypted = decryptBill(rawBill);
      const billItems = Array.isArray(decrypted.items) ? decrypted.items : [];
      for (const item of billItems) {
        if (!item?.name) continue;
        soldMap[item.name] = (soldMap[item.name] || 0) + (item.quantity || 0);
      }
    }

    const mostSold = Object.entries(soldMap)
      .map(([name, totalSold]) => ({ name, totalSold }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    /* -------------------------------
       RECENT BILLS
    -------------------------------- */
    const rawRecentBills = await Bill.find({ shopId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id dailyBillNumber totalAmount createdAt items")
      .lean();

    const recentBills = rawRecentBills.map((bill) => {
      const d = decryptBill(bill);
      return {
        _id: d._id,
        dailyBillNumber: d.dailyBillNumber,
        totalAmount: d.totalAmount,
        createdAt: d.createdAt,
        items: d.items,
      };
    });

    /* -------------------------------
       RESPONSE
    -------------------------------- */
    res.status(200).json({
  success: true,
  dashboard: {
    shop: {
      ownerName: shop.ownerName,
      shopName: shop.shopName,
      upiId: shop.upiId,
      mobileNumber:shop.mobileNumber,

      gstNumber: shop.gstNumber, // 🧾 GST
      address: shop.address,   // 📍 Address

      profileCompletion,
    },

    updateAvailable,
    updateMessage,
    latestVersion,
    forceUpdate,
    playStoreUrl,

    topDebtor: topDebtor
      ? {
          customerId: topDebtor._id,
          name: topDebtor.name,
          amount: topDebtor.totalPending,
          mobileNumber: topDebtor.mobileNumber,
          isSupplier: topDebtor.isSupplier,
        }
      : null,

    lowStock,
    mostSold,
    recentBills,
  },
});

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      message: "Failed to load dashboard",
    });
  }
}
