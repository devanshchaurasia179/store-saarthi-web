/**
 * Builds a plain-text receipt for a 58 mm thermal printer.
 *
 * Layout (20-char block, centered on paper by the print script):
 *   Item            Qty  Amt
 *
 * Line prefixes: !H! header bold, !B! emphasis bold
 */

const COL = 20;
const COL_BOLD = 18;
const QTY_W = 3;
const AMT_W = 5;
const DIVIDER = "-".repeat(COL);
const THICK = "=".repeat(COL);

function padLine(text, width = COL) {
  const s = String(text ?? "");
  if (s.length >= width) return s.substring(0, width);
  return s + " ".repeat(width - s.length);
}

function centre(text, width = COL) {
  text = String(text);
  if (text.length >= width) return text.substring(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return padLine(" ".repeat(pad) + text, width);
}

function twoCol(label, value, width = COL) {
  label = String(label);
  value = String(value);
  const maxLabel = Math.max(0, width - value.length - 1);
  if (label.length > maxLabel) label = label.substring(0, maxLabel);
  const spaces = Math.max(1, width - label.length - value.length);
  return padLine(label + " ".repeat(spaces) + value, width);
}

function threeCol(left, qty, amt, width = COL) {
  const q = String(qty).substring(0, QTY_W).padStart(QTY_W);
  const a = String(amt).substring(0, AMT_W).padStart(AMT_W);
  const right = `${q} ${a}`;
  const leftW = width - right.length - 1;
  let l = String(left);
  if (l.length > leftW) l = l.substring(0, leftW);
  const spaces = Math.max(1, width - l.length - right.length);
  return padLine(l + " ".repeat(spaces) + right, width);
}

function money(value) {
  const n = Number(value) || 0;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function formatTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}

function wrapText(text, width = COL) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const words = raw.split(/\s+/);
  const out = [];
  let cur = "";

  const pushChunks = (word) => {
    for (let i = 0; i < word.length; i += width) {
      out.push(word.substring(i, i + width));
    }
  };

  for (const word of words) {
    if (word.length > width) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      pushChunks(word);
      continue;
    }
    if (!cur) {
      cur = word;
      continue;
    }
    if ((cur + " " + word).length <= width) {
      cur = cur + " " + word;
    } else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function buildReceiptText(data) {
  const isTest = !data;

  if (isTest) {
    data = {
      shopName: "StoreSaarthi",
      customerName: "Walk-in",
      billNumber: 1,
      createdAt: new Date().toISOString(),
      items: [
        { name: "Cocktail Momos (Paneer)", qty: 1, price: 240, total: 240 },
        { name: "Creamy Momos (Veg)", qty: 2, price: 220, total: 440 },
      ],
      subtotal: 680,
      discount: 0,
      tax: 10,
      total: 748,
      paid: 748,
      paymentMode: "CASH",
      paymentStatus: "PAID",
    };
  }

  const lines = [];
  const shop = String(data.shopName || "StoreSaarthi").trim();

  const shopLines = wrapText(shop, COL);
  if (shopLines.length === 0) shopLines.push("StoreSaarthi");
  shopLines.forEach((ln) => {
    lines.push(`!H!${centre(ln)}`);
  });

  if (isTest) lines.push(centre("TEST PRINT"));
  lines.push(DIVIDER);

  if (data.billNumber != null) {
    lines.push(padLine(`Bill #${data.billNumber}`));
  }
  lines.push(twoCol(formatDate(data.createdAt), formatTime(data.createdAt)));

  if (data.customerName) {
    lines.push(padLine("Customer:"));
    wrapText(data.customerName, COL).forEach((ln) => lines.push(padLine(ln)));
  }

  lines.push(DIVIDER);
  lines.push(threeCol("Item", "Qty", "Amt"));
  lines.push(DIVIDER);

  (data.items || []).forEach((item) => {
    const name = String(item.name || "Item");
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const total = item.total != null ? Number(item.total) : qty * price;

    const nameLines = wrapText(name, COL);
    nameLines.forEach((ln, i) => {
      if (i === nameLines.length - 1) {
        const q = String(qty);
        const a = money(total);
        const right = `${q.padStart(QTY_W)} ${a.padStart(AMT_W)}`;
        if (ln.length + 1 + right.length <= COL) {
          lines.push(threeCol(ln, q, a));
        } else {
          lines.push(padLine(ln));
          lines.push(threeCol("", q, a));
        }
      } else {
        lines.push(padLine(ln));
      }
    });

    lines.push(padLine(` @${money(price)}`));
  });

  lines.push(DIVIDER);

  const subtotal = Number(data.subtotal) || 0;
  const discount = Number(data.discount) || 0;
  const taxPct = Number(data.tax) || 0;
  const total = Number(data.total) || 0;
  const paid = Number(data.paid) || 0;

  lines.push(twoCol("Subtotal", money(subtotal)));

  if (discount > 0) {
    lines.push(twoCol("Discount", `-${money(discount)}`));
  }

  if (taxPct > 0) {
    const taxAmt = Math.round((subtotal * taxPct) / 100);
    lines.push(twoCol(`Tax ${taxPct}%`, money(taxAmt)));
  }

  lines.push(THICK);
  lines.push(`!B!${twoCol("TOTAL", money(total), COL_BOLD)}`);
  lines.push(THICK);

  if (data.paymentMode && data.paymentMode !== "NONE") {
    lines.push(twoCol("Paid", String(data.paymentMode)));
  }

  if (data.paymentStatus === "PARTIAL") {
    lines.push(twoCol("Paid amt", money(paid)));
    lines.push(twoCol("Due", money(total - paid)));
  } else if (data.paymentStatus === "UNPAID") {
    lines.push(twoCol("Status", "UNPAID"));
    lines.push(twoCol("Due", money(total)));
  } else {
    lines.push(twoCol("Status", "PAID"));
  }

  lines.push(DIVIDER);

  // UPI QR code marker — the print engine will replace this with an actual QR image
  if (data.upiId) {
    lines.push(centre("Scan to Pay"));
    lines.push(`!QR!${data.upiId}`);
    lines.push(DIVIDER);
  }

  lines.push(centre("Thank you!"));
  lines.push(centre("Visit us again"));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));
  lines.push(padLine(""));

  return lines.join("\r\n");
}

buildReceiptText.RECEIPT_COL = COL;
module.exports = buildReceiptText;
