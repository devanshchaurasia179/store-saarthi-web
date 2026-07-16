import { apiFetch } from './client'
import type { Product } from '../types/bill'

export function fetchProducts() {
  return apiFetch<{ success: boolean; products: Product[] }>('/api/products')
}
