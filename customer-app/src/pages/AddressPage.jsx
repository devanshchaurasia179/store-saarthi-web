import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, MapPin, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { addressService } from '../services/addressService'
import AddressCard from '../components/AddressCard'
import AddressForm from '../components/AddressForm'
import BottomSheet from '../components/BottomSheet'
import { Skeleton } from '../components/Skeleton'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function AddressPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)

  // Fetch addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAddresses(),
  })

  // Add address mutation
  const addMutation = useMutation({
    mutationFn: (data) => addressService.addAddress(data),
    onSuccess: (res) => {
      queryClient.setQueryData(['addresses'], res.data.addresses)
      syncProfile(res.data.addresses)
      setShowForm(false)
    },
  })

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => addressService.updateAddress(id, data),
    onSuccess: (res) => {
      queryClient.setQueryData(['addresses'], res.data.addresses)
      syncProfile(res.data.addresses)
      setEditingAddress(null)
      setShowForm(false)
    },
  })

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => addressService.deleteAddress(id),
    onSuccess: (res) => {
      queryClient.setQueryData(['addresses'], res.data.addresses)
      syncProfile(res.data.addresses)
    },
  })

  // Set default mutation
  const defaultMutation = useMutation({
    mutationFn: (id) => addressService.setDefault(id),
    onSuccess: (res) => {
      queryClient.setQueryData(['addresses'], res.data.addresses)
      syncProfile(res.data.addresses)
    },
  })

  const syncProfile = useCallback((addresses) => {
    // Update the auth context with new addresses
    updateUser((prev) => ({ ...prev, addresses }))
  }, [updateUser])

  const handleAdd = (data) => {
    addMutation.mutate(data)
  }

  const handleUpdate = (data) => {
    if (!editingAddress) return
    updateMutation.mutate({ id: editingAddress._id, data })
  }

  const handleEdit = (address) => {
    setEditingAddress(address)
    setShowForm(true)
  }

  const handleDelete = (address) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteMutation.mutate(address._id)
    }
  }

  const handleSetDefault = (address) => {
    defaultMutation.mutate(address._id)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAddress(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              My Addresses
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage your delivery addresses
            </p>
          </div>
        </div>
      </div>

      {/* Add address button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => { setEditingAddress(null); setShowForm(true) }}
        className="w-full flex items-center gap-3 p-4 bg-white border-2 border-dashed border-primary/30 rounded-2xl hover:border-primary hover:bg-primary-50/30 transition-all mb-5 group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
          <Plus className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
        </div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">
          Add new address
        </span>
      </motion.button>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Address list */}
      {!isLoading && addresses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-subheading font-semibold text-gray-700 mb-1">
            No addresses yet
          </h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Add your delivery address to get started with ordering
          </p>
        </motion.div>
      )}

      {!isLoading && addresses.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {addresses.map((address) => (
              <AddressCard
                key={address._id}
                address={address}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Address Form Bottom Sheet */}
      <BottomSheet
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
      >
        <div className="px-5 py-4">
          <AddressForm
            initialData={editingAddress}
            onSubmit={editingAddress ? handleUpdate : handleAdd}
            onCancel={handleCloseForm}
            loading={addMutation.isPending || updateMutation.isPending}
          />
        </div>
      </BottomSheet>
    </motion.div>
  )
}
