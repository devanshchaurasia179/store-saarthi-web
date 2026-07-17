import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createProduct,
  deleteProduct,
  fetchInventory,
  updateProduct,
} from '../api/inventory'
import { ApiError } from '../api/client'
import type {
  CreateProductPayload,
  InventoryProduct,
  UpdateProductPayload,
} from '../types/inventory'

type UseInventoryReturn = {
  products: InventoryProduct[]
  loading: boolean
  error: string
  saving: boolean
  saveError: string
  refresh: () => void
  addProduct: (payload: CreateProductPayload) => Promise<InventoryProduct>
  editProduct: (id: string, payload: UpdateProductPayload) => Promise<InventoryProduct>
  removeProduct: (id: string) => Promise<void>
}

export function useInventory(): UseInventoryReturn {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const refreshRef = useRef(0)

  const load = useCallback(() => {
    refreshRef.current += 1
    const tick = refreshRef.current

    setLoading(true)
    setError('')

    fetchInventory()
      .then((res) => {
        if (tick !== refreshRef.current) return
        setProducts(res.products)
      })
      .catch((err) => {
        if (tick !== refreshRef.current) return
        setError(err instanceof ApiError ? err.message : 'Failed to load inventory')
      })
      .finally(() => {
        if (tick === refreshRef.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addProduct = useCallback(
    async (payload: CreateProductPayload): Promise<InventoryProduct> => {
      setSaving(true)
      setSaveError('')
      try {
        const res = await createProduct(payload)
        setProducts((prev) => [res.product, ...prev])
        return res.product
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to save product'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const editProduct = useCallback(
    async (id: string, payload: UpdateProductPayload): Promise<InventoryProduct> => {
      setSaving(true)
      setSaveError('')
      try {
        const res = await updateProduct(id, payload)
        setProducts((prev) =>
          prev.map((p) => (p._id === id ? res.product : p)),
        )
        return res.product
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to update product'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const removeProduct = useCallback(async (id: string): Promise<void> => {
    setSaving(true)
    setSaveError('')
    try {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p._id !== id))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete product'
      setSaveError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    products,
    loading,
    error,
    saving,
    saveError,
    refresh: load,
    addProduct,
    editProduct,
    removeProduct,
  }
}
