import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function OTPInput({ length = 6, value = '', onChange, disabled = false }) {
  const inputsRef = useRef([])
  const [digits, setDigits] = useState(Array(length).fill(''))

  // Sync with external value
  useEffect(() => {
    const arr = value.split('').slice(0, length)
    const padded = [...arr, ...Array(length - arr.length).fill('')]
    setDigits(padded)
  }, [value, length])

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return

    const newDigits = [...digits]
    
    // Handle paste of multiple digits
    if (val.length > 1) {
      const chars = val.split('').slice(0, length - index)
      chars.forEach((char, i) => {
        if (index + i < length) {
          newDigits[index + i] = char
        }
      })
      setDigits(newDigits)
      onChange(newDigits.join(''))
      
      const nextIndex = Math.min(index + chars.length, length - 1)
      inputsRef.current[nextIndex]?.focus()
      return
    }

    newDigits[index] = val.slice(-1)
    setDigits(newDigits)
    onChange(newDigits.join(''))

    // Move to next
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newDigits = [...digits]
      
      if (digits[index]) {
        newDigits[index] = ''
        setDigits(newDigits)
        onChange(newDigits.join(''))
      } else if (index > 0) {
        newDigits[index - 1] = ''
        setDigits(newDigits)
        onChange(newDigits.join(''))
        inputsRef.current[index - 1]?.focus()
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!paste) return

    const newDigits = paste.split('')
    const padded = [...newDigits, ...Array(length - newDigits.length).fill('')]
    setDigits(padded)
    onChange(padded.join(''))

    const focusIndex = Math.min(paste.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  const handleFocus = (index) => {
    inputsRef.current[index]?.select()
  }

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200 font-body disabled:opacity-50 disabled:cursor-not-allowed ${
            digit
              ? 'border-primary bg-primary-50/50 text-primary'
              : 'border-gray-200 bg-white text-gray-800 focus:border-primary focus:bg-primary-50/30'
          }`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
