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
}

/** Thermal print via Backend (Windows machine that runs the API). */
export function printBillOnServer(billId: string) {
  return apiFetch<{ success: boolean; message?: string; error?: string }>(
    `/api/print/bill/${billId}`,
    { method: 'POST' },
  )
}

/** Thermal print via local print-agent on this PC. */
export async function printBillOnAgent(payload: PrintBillPayload) {
  const res = await fetch('/print-agent/print-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let data: { success?: boolean; message?: string; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
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
  }
}

/**
 * Prefer Backend printer, then local print-agent.
 * Throws if both fail.
 */
export async function printBill(
  billId: string,
  payload: PrintBillPayload,
): Promise<{ via: 'server' | 'agent'; message: string }> {
  try {
    const res = await printBillOnServer(billId)
    return {
      via: 'server',
      message: res.message || 'Bill sent to printer',
    }
  } catch (serverErr) {
    try {
      const res = await printBillOnAgent(payload)
      return {
        via: 'agent',
        message: res.message || 'Bill sent to printer',
      }
    } catch (agentErr) {
      const serverMsg =
        serverErr instanceof ApiError ? serverErr.message : 'Server print failed'
      const agentMsg =
        agentErr instanceof ApiError ? agentErr.message : 'Print agent failed'
      throw new ApiError(
        500,
        `Could not reach a printer. Backend: ${serverMsg}. Agent: ${agentMsg}`,
      )
    }
  }
}
