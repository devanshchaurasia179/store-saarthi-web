import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  ClipboardList,
  LogOut,
  ChevronRight,
  Edit2,
  Loader2,
  Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { formatPhone } from '../utils/formatters'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [isEditingName, setIsEditingName] = useState(false)
  const [name, setName] = useState(user?.name || '')

  // Update name mutation
  const updateNameMutation = useMutation({
    mutationFn: (newName) => authService.updateProfile({ name: newName }),
    onSuccess: (res) => {
      updateUser(res.data.customer)
      setIsEditingName(false)
    },
  })

  const handleSaveName = () => {
    if (!name.trim()) return
    updateNameMutation.mutate(name.trim())
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (e) {
      // ignore
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-4 min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <span className="text-white font-heading font-bold text-2xl">
            {(user?.name || user?.phone || 'U').charAt(0).toUpperCase()}
          </span>
        </div>

        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 border-2 border-primary rounded-lg text-sm font-medium text-gray-800 outline-none w-40 text-center"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button
              onClick={handleSaveName}
              disabled={updateNameMutation.isPending}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"
            >
              {updateNameMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-subheading text-lg font-semibold text-gray-800">
              {user?.name || 'Set your name'}
            </h2>
            <button
              onClick={() => setIsEditingName(true)}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Edit name"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          +91 {formatPhone(user?.phone || '')}
        </p>
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <MenuItem
          icon={ClipboardList}
          label="My Orders"
          description="View order history & track"
          to="/orders"
        />
        <MenuItem
          icon={MapPin}
          label="Saved Addresses"
          description="Manage delivery addresses"
          to="/address"
        />
      </div>

      {/* Logout */}
      <div className="mt-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </motion.button>
      </div>

      {/* App version */}
      <p className="text-center text-xs text-gray-300 mt-8">
        Store Saarthi v1.0.0
      </p>
    </motion.div>
  )
}

/* ================================
   Menu Item
================================ */
function MenuItem({ icon: Icon, label, description, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </Link>
  )
}
