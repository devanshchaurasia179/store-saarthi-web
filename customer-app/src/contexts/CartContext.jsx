import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'store_saarthi_cart'

function getInitialState() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // ignore
  }
  return { shopId: null, items: [], shopName: '' }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== id),
        }
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      }
    }

    case 'SET_SHOP':
      return {
        shopId: action.payload.shopId,
        shopName: action.payload.shopName,
        items: [],
      }

    case 'CLEAR_CART':
      return { shopId: state.shopId, shopName: state.shopName, items: [] }

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, null, getInitialState)

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const addItem = useCallback((item, shopId, shopName) => {
    // If cart belongs to a different shop, warn
    if (state.shopId && state.shopId !== shopId) {
      const confirmed = window.confirm(
        'Your cart has items from another shop. Do you want to clear it and add items from this shop?'
      )
      if (!confirmed) return
      dispatch({ type: 'SET_SHOP', payload: { shopId, shopName } })
    } else if (!state.shopId) {
      dispatch({ type: 'SET_SHOP', payload: { shopId, shopName } })
    }
    dispatch({ type: 'ADD_ITEM', payload: item })
  }, [state.shopId])

  const removeItem = useCallback((id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }, [])

  const updateQuantity = useCallback((id, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = state.items.reduce(
    (sum, item) => {
      const price = typeof item.price === 'object' ? (item.price?.sellingPrice ?? 0) : (Number(item.price) || 0)
      return sum + price * item.quantity
    },
    0
  )

  return (
    <CartContext.Provider
      value={{
        ...state,
        totalItems,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
