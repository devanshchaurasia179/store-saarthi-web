/**
 * Format price in INR
 */
export function formatPrice(price) {
  const num = Number(price)
  if (isNaN(num)) return '₹0'
  return `₹${num.toFixed(0)}`
}

/**
 * Format discount percentage
 */
export function calculateDiscount(originalPrice, sellingPrice) {
  if (!originalPrice || originalPrice <= sellingPrice) return 0
  return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}
