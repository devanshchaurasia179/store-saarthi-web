import Bill from "../models/Bill.js";
import Shop from "../models/Shop.js";
import { decrypt } from "../utils/encrypt.js";

/* --------------------------------------------------
   DECRYPT HELPER
-------------------------------------------------- */
const ENCRYPTED_FIELDS = ["items", "subTotal", "discount", "taxPercentage", "totalAmount", "paidAmount"];

function decryptBill(doc) {
  if (!doc) return doc;
  const obj = { ...doc };
  for (const field of ENCRYPTED_FIELDS) {
    if (obj[field] !== undefined && obj[field] !== null) {
      obj[field] = decrypt(obj[field]);
    }
  }
  return obj;
}

/* --------------------------------------------------
   TIMEZONE CONSTANT
-------------------------------------------------- */
const IST_OFFSET_MINUTES = 330; // UTC +5:30

/* --------------------------------------------------
   IST DAY RANGE
-------------------------------------------------- */
function getISTDayRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();

  const start = new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0, 0, 0, 0
    ) - IST_OFFSET_MINUTES * 60 * 1000
  );

  const end = new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23, 59, 59, 999
    ) - IST_OFFSET_MINUTES * 60 * 1000
  );

  return { start, end };
}

/* --------------------------------------------------
   IST WEEK RANGE (SUN → SAT)
-------------------------------------------------- */
function getISTWeekRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();

  const startIST = new Date(d);
  startIST.setDate(d.getDate() - day);
  startIST.setHours(0, 0, 0, 0);

  const endIST = new Date(startIST);
  endIST.setDate(startIST.getDate() + 6);
  endIST.setHours(23, 59, 59, 999);

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
    end: new Date(endIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
  };
}

/* --------------------------------------------------
   IST MONTH RANGE
-------------------------------------------------- */
function getISTMonthRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();

  const startIST = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const endIST = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
    end: new Date(endIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
  };
}

/* --------------------------------------------------
   IST YEAR RANGE
-------------------------------------------------- */
function getISTYearRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();

  const startIST = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
  const endIST = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
    end: new Date(endIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
  };
}

/* --------------------------------------------------
   IST GROUPING KEYS
-------------------------------------------------- */
function getISTDayKey(date) {
  const d = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return d.toISOString().split("T")[0];
}

function getISTWeekStartKey(date) {
  const d = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function getISTMonthKey(date) {
  const d = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* --------------------------------------------------
   ✅ VARIANT-AWARE ANALYTICS CORE – NOW SORTED BY QUANTITY
-------------------------------------------------- */
function computeAnalyticsFromBills(bills) {
  let totalSales = 0;
  let totalDebt = 0;
  let totalCollected = 0;
  let biggestBill = null;
  let maxBillAmount = 0;

  const productMap = {};
  // 🔥 PRODUCT + VARIANT SAFE
    const paymentModeStats = {
    CASH: 0,
    UPI: 0,
    OTHERS:0,
  };

  for (const bill of bills) {
    const billTotal = Number(bill.totalAmount) || 0;
    const paid = Number(bill.paidAmount) || 0;
  const mode = bill.paymentMode || "NONE";
  if (paymentModeStats[mode] !== undefined) {
    paymentModeStats[mode] += paid;
  }

    totalSales += billTotal;
    totalCollected += paid;

    const debt = billTotal - paid;
    if (debt > 0) totalDebt += debt;

    if (billTotal > maxBillAmount) {
      maxBillAmount = billTotal;
      biggestBill = bill;
    }

    for (const item of bill.items || []) {
      const productId = String(item.productId);
      const variantId = item.variantId ? String(item.variantId) : "NO_VARIANT";
      const unit = item.unit || "unit";

      if (!productMap[productId]) {
        productMap[productId] = {
          productId,
          name: item.name.split(" (")[0], // base product name
          variants: {},
        };
      }

      if (!productMap[productId].variants[variantId]) {
        productMap[productId].variants[variantId] = {
          variantId: variantId === "NO_VARIANT" ? null : variantId,
          name: item.name,
          unit,
          quantity: 0,
          revenue: 0,
        };
      }

      productMap[productId].variants[variantId].quantity += Number(item.quantity) || 0;
      productMap[productId].variants[variantId].revenue += Number(item.total) || 0;
    }
  }

  // ────────────────────────────────────────────────
  //  NEW: Prepare array + calculate product totals
  // ────────────────────────────────────────────────
  const productsArray = Object.values(productMap).map(product => {
    let totalQuantity = 0;
    let totalRevenue = 0;

    const variantsArray = Object.values(product.variants).map(variant => {
      totalQuantity += variant.quantity;
      totalRevenue += variant.revenue;
      return variant;
    });

    return {
      ...product,
      totalQuantity,
      totalRevenue,
      variants: variantsArray,
    };
  });

  // ────────────────────────────────────────────────
  //  Sort VARIANTS inside each product by quantity ↓
  // ────────────────────────────────────────────────
  productsArray.forEach(product => {
    product.variants.sort((a, b) => b.quantity - a.quantity);
  });

  // ────────────────────────────────────────────────
  //  Sort PRODUCTS themselves by total quantity ↓
  // ────────────────────────────────────────────────
  productsArray.sort((a, b) => b.totalQuantity - a.totalQuantity);

  // ────────────────────────────────────────────────
  //  Final return – now sorted
  // ────────────────────────────────────────────────
    return {
    totalSales,
    biggestBill,
    products: productsArray,
    paymentModes: paymentModeStats, // 🔥 ADDED
    debtVsSales: {
      totalDebt,
      totalSales,
      totalCollected,
    },
  };

}

/* --------------------------------------------------
   AUTH
-------------------------------------------------- */
function getShopId(req, res) {
  if (!req.user || !req.user._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user._id;
}

/* --------------------------------------------------
   DAILY ANALYTICS
-------------------------------------------------- */
export async function getDailyAnalytics(req, res) {
  try {
    const shopId = getShopId(req, res);
    if (!shopId) return;

    const { date } = req.query;
    const { start, end } = getISTDayRange(date);

    const bills = await Bill.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
    }).lean().then(r => r.map(decryptBill));

    res.json({
      success: true,
      date: getISTDayKey(start),
      ...computeAnalyticsFromBills(bills),
    });
  } catch {
    res.status(500).json({ success: false });
  }
}

/* --------------------------------------------------
   WEEKLY ANALYTICS
-------------------------------------------------- */
export async function getWeeklyAnalytics(req, res) {
  try {
    const shopId = getShopId(req, res);
    if (!shopId) return;

    const { date } = req.query;
    const { start, end } = getISTWeekRange(date);

    const bills = await Bill.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
    }).lean().then(r => r.map(decryptBill));

    const dailyMap = {};
    for (const bill of bills) {
      const key = getISTDayKey(bill.createdAt);
      if (!dailyMap[key]) dailyMap[key] = [];
      dailyMap[key].push(bill);
    }

    const days = Object.keys(dailyMap).sort().map(day => ({
      date: day,
      ...computeAnalyticsFromBills(dailyMap[day]),
    }));

    res.json({
      success: true,
      ...computeAnalyticsFromBills(bills),
      days,
    });
  } catch {
    res.status(500).json({ success: false });
  }
}

/* --------------------------------------------------
   MONTHLY ANALYTICS
-------------------------------------------------- */
export async function getMonthlyAnalytics(req, res) {
  try {
    const shopId = getShopId(req, res);
    if (!shopId) return;

    const { date } = req.query;
    const { start, end } = getISTMonthRange(date);

    const bills = await Bill.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
    }).lean().then(r => r.map(decryptBill));

    const weekMap = {};
    for (const bill of bills) {
      const key = getISTWeekStartKey(bill.createdAt);
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(bill);
    }

    const weeks = Object.keys(weekMap).sort().map(week => ({
      weekStart: week,
      ...computeAnalyticsFromBills(weekMap[week]),
    }));

    res.json({
      success: true,
      ...computeAnalyticsFromBills(bills),
      weeks,
    });
  } catch {
    res.status(500).json({ success: false });
  }
}

/* --------------------------------------------------
   YEARLY ANALYTICS
-------------------------------------------------- */
export async function getYearlyAnalytics(req, res) {
  try {
    const shopId = getShopId(req, res);
    if (!shopId) return;

    const { date } = req.query;
    const { start, end } = getISTYearRange(date);

    const bills = await Bill.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
    }).lean().then(r => r.map(decryptBill));

    const monthMap = {};
    for (const bill of bills) {
      const key = getISTMonthKey(bill.createdAt);
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(bill);
    }

    const months = Object.keys(monthMap).sort().map(month => ({
      month,
      ...computeAnalyticsFromBills(monthMap[month]),
    }));

    res.json({
      success: true,
      ...computeAnalyticsFromBills(bills),
      months,
    });
  } catch {
    res.status(500).json({ success: false });
  }
}


/* --------------------------------------------------
   REPORT GENERATION
   Periods: last_month | last_quarter | last_6_months | last_year
   Format: daily rows, grouped by month with cumulative totals
-------------------------------------------------- */

function getReportDateRange(period) {
  // Work in IST
  const nowUTC = new Date();
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  let startIST, endIST;

  if (period === "this_month") {
    // Current calendar month from day 1 up to today
    startIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1, 0, 0, 0, 0);
    endIST   = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 23, 59, 59, 999);
  } else if (period === "last_month") {
    // Previous calendar month
    const y = nowIST.getMonth() === 0 ? nowIST.getFullYear() - 1 : nowIST.getFullYear();
    const m = nowIST.getMonth() === 0 ? 11 : nowIST.getMonth() - 1;
    startIST = new Date(y, m, 1, 0, 0, 0, 0);
    endIST   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  } else if (period === "last_quarter") {
    // Previous 3 full calendar months
    const end = new Date(nowIST.getFullYear(), nowIST.getMonth(), 0, 23, 59, 59, 999);
    const start = new Date(end.getFullYear(), end.getMonth() - 2, 1, 0, 0, 0, 0);
    startIST = start;
    endIST   = end;
  } else if (period === "last_6_months") {
    const end = new Date(nowIST.getFullYear(), nowIST.getMonth(), 0, 23, 59, 59, 999);
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1, 0, 0, 0, 0);
    startIST = start;
    endIST   = end;
  } else if (period === "last_year") {
    // Previous calendar year
    const y = nowIST.getFullYear() - 1;
    startIST = new Date(y, 0, 1, 0, 0, 0, 0);
    endIST   = new Date(y, 11, 31, 23, 59, 59, 999);
  } else {
    // Default: last_month
    const y = nowIST.getMonth() === 0 ? nowIST.getFullYear() - 1 : nowIST.getFullYear();
    const m = nowIST.getMonth() === 0 ? 11 : nowIST.getMonth() - 1;
    startIST = new Date(y, m, 1, 0, 0, 0, 0);
    endIST   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  }

  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000),
    end:   new Date(endIST.getTime()   - IST_OFFSET_MINUTES * 60 * 1000),
    startIST,
    endIST,
  };
}

export async function getAnalyticsReport(req, res) {
  try {
    const shopId = getShopId(req, res);
    if (!shopId) return;

    const { period = "last_month" } = req.query;
    const validPeriods = ["this_month", "last_month", "last_quarter", "last_6_months", "last_year"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ success: false, message: "Invalid period" });
    }

    const { start, end, startIST, endIST } = getReportDateRange(period);

    // Fetch shop name for the report header
    const shop = await Shop.findById(shopId).select("shopName").lean();
    const shopName = shop?.shopName || "My Store";

    const bills = await Bill.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
    }).lean().then(r => r.map(decryptBill));

    // ── Build a day-keyed map ──
    const dayMap = {};
    for (const bill of bills) {
      const key = getISTDayKey(bill.createdAt);
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(bill);
    }

    // ── Build a month-keyed map ──
    const monthMap = {};
    for (const bill of bills) {
      const key = getISTMonthKey(bill.createdAt);
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(bill);
    }

    // ── Enumerate every calendar day in range ──
    const rows = []; // { type: "day"|"month_total", date, label, totalSales, collected, debt, billCount, cash, upi, others }

    // Iterate month by month
    const cursor = new Date(startIST);
    cursor.setDate(1);

    while (cursor <= endIST) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

      // Days in this month within range
      const firstDay = new Date(Math.max(cursor.getTime(), startIST.getTime()));
      const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const lastDay = new Date(Math.min(lastDayOfMonth.getTime(), endIST.getTime()));

      const dayRows = [];

      const d = new Date(firstDay);
      while (d <= lastDay) {
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const dayBills = dayMap[dayKey] || [];

        let totalSales = 0, collected = 0, debt = 0, cash = 0, upi = 0, others = 0;
        for (const b of dayBills) {
          const amt = Number(b.totalAmount) || 0;
          const paid = Number(b.paidAmount) || 0;
          totalSales += amt;
          collected += paid;
          if (amt - paid > 0) debt += (amt - paid);
          if (b.paymentMode === "CASH") cash += paid;
          else if (b.paymentMode === "UPI") upi += paid;
          else others += paid;
        }

        // Only include days that have at least one bill (skip zero-sales days)
        if (dayBills.length > 0) {
          dayRows.push({
            type: "day",
            date: dayKey,
            label: new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
            totalSales,
            collected,
            debt,
            billCount: dayBills.length,
            cash,
            upi,
            others,
          });
        }

        d.setDate(d.getDate() + 1);
      }

      rows.push(...dayRows);

      // Month cumulative total row
      const monthBills = monthMap[monthKey] || [];
      let mSales = 0, mCollected = 0, mDebt = 0, mBills = 0, mCash = 0, mUpi = 0, mOthers = 0;
      for (const b of monthBills) {
        const amt = Number(b.totalAmount) || 0;
        const paid = Number(b.paidAmount) || 0;
        mSales += amt;
        mCollected += paid;
        if (amt - paid > 0) mDebt += (amt - paid);
        mBills++;
        if (b.paymentMode === "CASH") mCash += paid;
        else if (b.paymentMode === "UPI") mUpi += paid;
        else mOthers += paid;
      }

      const monthLabel = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      rows.push({
        type: "month_total",
        date: monthKey,
        label: `TOTAL — ${monthLabel}`,
        totalSales: mSales,
        collected: mCollected,
        debt: mDebt,
        billCount: mBills,
        cash: mCash,
        upi: mUpi,
        others: mOthers,
      });

      // Move to next month
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
    }

    // Overall grand total
    let gSales = 0, gCollected = 0, gDebt = 0, gBills = 0, gCash = 0, gUpi = 0, gOthers = 0;
    for (const b of bills) {
      const amt = Number(b.totalAmount) || 0;
      const paid = Number(b.paidAmount) || 0;
      gSales += amt;
      gCollected += paid;
      if (amt - paid > 0) gDebt += (amt - paid);
      gBills++;
      if (b.paymentMode === "CASH") gCash += paid;
      else if (b.paymentMode === "UPI") gUpi += paid;
      else gOthers += paid;
    }

    res.json({
      success: true,
      shopName,
      period,
      from: startIST.toISOString().split("T")[0],
      to: endIST.toISOString().split("T")[0],
      grandTotal: {
        totalSales: gSales,
        collected: gCollected,
        debt: gDebt,
        billCount: gBills,
        cash: gCash,
        upi: gUpi,
        others: gOthers,
      },
      rows,
    });
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
}
