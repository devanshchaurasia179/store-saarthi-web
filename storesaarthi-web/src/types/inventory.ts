export type ProductUnit = 'unit' | 'kg' | 'g' | 'litre' | 'ml' | 'box' | 'pack' | 'dozen'

export const PRODUCT_UNITS: ProductUnit[] = [
  'unit', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen',
]

export type InventoryVariant = {
  _id: string
  name: string
  barcode?: string | null
  price: { sellingPrice: number }
  quantity: number
  isActive: boolean
}

export type InventoryProduct = {
  _id: string
  shopId: string
  name: string
  barcode: string
  category: string
  unit: ProductUnit
  price: { sellingPrice: number }
  quantity: number
  variants: InventoryVariant[]
  expiryDate: string | null
  isTrackable: boolean
  isBarcodeListed: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ——— Payloads ———

export type VariantPayload = {
  name: string
  barcode?: string
  price: { sellingPrice: number }
  quantity?: number
  isActive?: boolean
}

export type CreateProductPayload = {
  name: string
  barcode: string
  category?: string
  unit?: ProductUnit
  price: { sellingPrice: number }
  quantity?: number
  variants?: VariantPayload[]
  expiryDate?: string | null
  isTrackable?: boolean
  isBarcodeListed?: boolean
}

export type UpdateProductPayload = Partial<CreateProductPayload>
