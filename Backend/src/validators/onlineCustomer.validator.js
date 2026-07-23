/* =========================================================
   ONLINE CUSTOMER VALIDATORS
   - Validate request bodies for customer auth and profile APIs
========================================================= */

/**
 * Validate phone number (Indian 10-digit mobile)
 */
export function validatePhone(phone) {
  if (!phone) return "Phone number is required";

  const cleaned = phone.replace(/\s/g, "");
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return "Invalid phone number. Must be a 10-digit Indian mobile number";
  }

  return null;
}

/**
 * Validate OTP format (6 digits)
 */
export function validateOtp(otp) {
  if (!otp) return "OTP is required";
  if (!/^\d{6}$/.test(otp)) return "OTP must be a 6-digit number";
  return null;
}

/**
 * Validate address object
 */
export function validateAddress(address) {
  const errors = [];

  if (!address) {
    errors.push("Address is required");
    return errors;
  }

  if (!address.fullAddress || !address.fullAddress.trim()) {
    errors.push("fullAddress is required");
  }

  if (address.latitude !== undefined && address.latitude !== null) {
    if (typeof address.latitude !== "number" || address.latitude < -90 || address.latitude > 90) {
      errors.push("latitude must be between -90 and 90");
    }
  }

  if (address.longitude !== undefined && address.longitude !== null) {
    if (typeof address.longitude !== "number" || address.longitude < -180 || address.longitude > 180) {
      errors.push("longitude must be between -180 and 180");
    }
  }

  if (address.pincode && !/^\d{6}$/.test(address.pincode)) {
    errors.push("pincode must be a 6-digit number");
  }

  return errors;
}

/**
 * Validate customer profile update
 */
export function validateProfileUpdate(body) {
  const errors = [];

  if (body.name !== undefined && typeof body.name !== "string") {
    errors.push("name must be a string");
  }

  if (body.name && body.name.trim().length < 2) {
    errors.push("name must be at least 2 characters");
  }

  return errors;
}
