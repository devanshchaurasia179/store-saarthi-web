import { apiFetch, ApiError } from './client'
import type { Bill } from '../types/bill'

export type PrintBillPayload = {
  shopName: string
  customerName: string | null
  billNumber: number
  createdAt: string
  items: Array<{
    name: string
    qty: number
    price: number
    total: number
    unit?: string
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paid: number
  paymentMode: string
  paymentStatus: string
  upiId?: string
}

/** Thermal print via Backend (cloud — used when the backend itself has a printer). */
export function printBillOnServer(billId: string) {
  return apiFetch<{ success: boolean; message?: string; error?: string }>(
    `/api/print/bill/${billId}`,
    { method: 'POST' },
  )
}

/**
 * Base URL for the local print agent.
 *
 * In dev: Vite proxies /print-agent → http://localhost:4000 (same-origin, no
 *         mixed-content issue).
 *
 * In production: the app is served over HTTPS, so calling http://localhost:4000
 *   directly is blocked by the browser as "mixed content".
 *   The workaround: open the app over HTTP on the shop PC:
 *     http://localhost:5173  (if running locally)
 *     OR access the Vercel URL via HTTP by stripping the "s":
 *     http://store-saarthi-api.vercel.app  ← browsers will redirect to https though
 *
 *   The REAL solution: open the web app at http://<local-ip> on the shop PC,
 *   not the https://vercel.app URL.  Then both the page and the agent are HTTP.
 *
 *   We always try http://localhost:4000 — if mixed content blocks it, we catch
 *   the TypeError and surface a clear message to the user.
 */
const AGENT_BASE = import.meta.env.DEV
  ? '/print-agent'       // dev: goes through Vite proxy, no mixed-content
  : 'http://localhost:4000'  // prod: direct — works when page is HTTP

/** Thermal print via local print-agent on this PC. */
export async function printBillOnAgent(payload: PrintBillPayload): Promise<{ success?: boolean; message?: string }> {
  let res: Response
  try {
    res = await fetch(`${AGENT_BASE}/print-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (networkErr) {
    // A TypeError here almost always means one of two things:
    //   1. The print agent isn't running (connection refused)
    //   2. Mixed-content block (https page → http agent)
    const isHttps = window.location.protocol === 'https:'
    if (isHttps) {
      throw new ApiError(
        0,
        'Mixed content blocked: your browser cannot call the local print agent from an HTTPS page. ' +
        'Open this app over HTTP on the shop PC (e.g. http://your-local-ip) instead of the HTTPS URL.',
      )
    }
    throw new ApiError(0, 'Print agent is not running. Start print-agent.exe first.')
  }

  let data: { success?: boolean; message?: string; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* ignore parse errors */
  }

  if (!res.ok || data.success === false) {
    throw new ApiError(
      res.status || 500,
      data.error || data.message || 'Print agent failed',
    )
  }

  return data
}

export function billToPrintPayload(
  bill: Bill,
  shopName: string,
  customerName: string | null,
  upiId?: string,
): PrintBillPayload {
  return {
    shopName,
    customerName,
    billNumber: bill.dailyBillNumber,
    createdAt: bill.createdAt,
    items: (bill.items || []).map((item) => ({
      name: item.name,
      qty: item.quantity,
      price: item.price,
      total: item.total,
      unit: item.unit,
    })),
    subtotal: Number(bill.subTotal) || 0,
    discount: Number(bill.discount) || 0,
    tax: Number(bill.taxPercentage) || 0,
    total: Number(bill.totalAmount) || 0,
    paid: Number(bill.paidAmount) || 0,
    paymentMode: bill.paymentMode,
    paymentStatus: bill.paymentStatus,
    upiId: upiId || undefined,
  }
}

/**
 * Print a bill. Strategy:
 *  1. Try local print-agent first (always preferred — it has the actual printer)
 *  2. Fall back to backend server print (for future use when backend has a printer)
 *  3. Throw with a clear combined error if both fail
 */
export async function printBill(
  billId: string,
  payload: PrintBillPayload,
): Promise<{ via: 'server' | 'agent'; message: string }> {
  // Try local agent first — it's the one with the actual printer
  try {
    const res = await printBillOnAgent(payload)
    return {
      via: 'agent',
      message: res.message || 'Bill sent to printer',
    }
  } catch (agentErr) {
    const agentMsg =
      agentErr instanceof ApiError ? agentErr.message : 'Print agent failed'

    // Agent failed — try the backend as a fallback
    try {
      const res = await printBillOnServer(billId)
      return {
        via: 'server',
        message: res.message || 'Bill sent to printer',
      }
    } catch (serverErr) {
      const serverMsg =
        serverErr instanceof ApiError ? serverErr.message : 'Server print failed'

      // Both failed — surface the agent error prominently (it's the main path)
      throw new ApiError(
        500,
        agentMsg.includes('Mixed content')
          ? agentMsg  // surface the actionable mixed-content message
          : `Print agent: ${agentMsg}. Backend: ${serverMsg}`,
      )
    }
  }
}
