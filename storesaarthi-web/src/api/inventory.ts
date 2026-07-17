import { apiFetch } from './client'
import type {
  CreateProductPayload,
  InventoryProduct,
  UpdateProductPayload,
} from '../types/inventory'

// ——— READ ———

export function fetchInventory() {
  return apiFetch<{ success: boolean; products: InventoryProduct[] }>('/api/products')
}

export function fetchProductById(productId: string) {
  return apiFetch<{ success: boolean; product: InventoryProduct }>(
    `/api/products/${productId}`,
  )
}

export function fetchProductByBarcode(barcode: string) {
  return apiFetch<{ success: boolean; product: InventoryProduct }>(
    `/api/products/barcode/${encodeURIComponent(barcode)}`,
  )
}

// ——— WRITE ———

export function createProduct(payload: CreateProductPayload) {
  return apiFetch<{ success: boolean; product: InventoryProduct }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProduct(productId: string, payload: UpdateProductPayload) {
  return apiFetch<{ success: boolean; product: InventoryProduct }>(
    `/api/products/${productId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
}

export function deleteProduct(productId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/products/${productId}`,
    { method: 'DELETE' },
  )
}
