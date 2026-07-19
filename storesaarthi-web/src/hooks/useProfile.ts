import { useCallback, useState } from 'react'
import { updateProfile, type UpdateProfilePayload } from '../api/profile'
import { ApiError } from '../api/client'
import type { Shop } from '../types/auth'

type UseProfileReturn = {
  saving: boolean
  saveError: string
  saveSuccess: boolean
  clearSaveStatus: () => void
  updateShopProfile: (payload: UpdateProfilePayload) => Promise<Shop>
}

export function useProfile(): UseProfileReturn {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const clearSaveStatus = useCallback(() => {
    setSaveError('')
    setSaveSuccess(false)
  }, [])

  const updateShopProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<Shop> => {
      setSaving(true)
      setSaveError('')
      setSaveSuccess(false)

      try {
        const res = await updateProfile(payload)
        setSaveSuccess(true)
        return res.shop
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to update profile'
        setSaveError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  return {
    saving,
    saveError,
    saveSuccess,
    clearSaveStatus,
    updateShopProfile,
  }
}
