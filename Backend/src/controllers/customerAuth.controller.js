import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import OnlineCustomer from "../models/OnlineCustomer.js";
import { validatePhone, validateOtp, validateAddress, validateProfileUpdate } from "../validators/onlineCustomer.validator.js";

/* =========================================================
   CUSTOMER AUTH CONTROLLER
   - OTP-based authentication for QR ordering customers
   - No passwords, phone verification only
========================================================= */

/* ================= HELPERS ================= */

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

function generateCustomerToken(customerId) {
  return jwt.sign(
    { customerId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "90d" }
  );
}

/* --------------------------------------------------
   SEND OTP
   POST /api/customer-auth/send-otp
   Body: { phone }
-------------------------------------------------- */
export async function customerSendOtp(req, res) {
  try {
    const { phone } = req.body;

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    const cleanPhone = phone.replace(/\s/g, "");

    // Find or create customer
    let customer = await OnlineCustomer.findOne({ phone: cleanPhone });

    if (!customer) {
      customer = await OnlineCustomer.create({ phone: cleanPhone });
    }

    // Generate and hash OTP
    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Save hashed OTP with expiry
    await OnlineCustomer.findByIdAndUpdate(customer._id, {
      otp: hashedOtp,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // TODO: Replace with actual SMS service (Twilio, MSG91, etc.)
    // For now, log OTP in development
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Customer OTP for ${cleanPhone}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // Remove in production — only for testing
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (error) {
    console.error("Customer Send OTP Error:", error.message);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
}

/* --------------------------------------------------
   VERIFY OTP & LOGIN
   POST /api/customer-auth/verify-otp
   Body: { phone, otp }
-------------------------------------------------- */
export async function customerVerifyOtp(req, res) {
  try {
    const { phone, otp } = req.body;

    const phoneError = validatePhone(phone);
    if (phoneError) {
      return res.status(400).json({ message: phoneError });
    }

    const otpError = validateOtp(otp);
    if (otpError) {
      return res.status(400).json({ message: otpError });
    }

    const cleanPhone = phone.replace(/\s/g, "");

    const customer = await OnlineCustomer.findOne({ phone: cleanPhone })
      .select("+otp +otpExpiresAt");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found. Send OTP first." });
    }

    // Check expiry
    if (!customer.otp || !customer.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP requested. Send OTP first." });
    }

    if (customer.otpExpiresAt < new Date()) {
      return res.status(401).json({ message: "OTP expired. Request a new one." });
    }

    // Compare OTP
    const isValid = await bcrypt.compare(otp, customer.otp);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Mark verified, clear OTP
    customer.isPhoneVerified = true;
    customer.otp = undefined;
    customer.otpExpiresAt = undefined;
    await customer.save();

    // Generate JWT
    const token = generateCustomerToken(customer._id);

    // Set cookie for web
    res.cookie("customer_jwt", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });

    res.status(200).json({
      success: true,
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isPhoneVerified: customer.isPhoneVerified,
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    console.error("Customer Verify OTP Error:", error.message);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
}

/* --------------------------------------------------
   GET PROFILE
   GET /api/customer-auth/me
   Auth: Customer JWT
-------------------------------------------------- */
export async function customerGetProfile(req, res) {
  try {
    const customer = req.customer;

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isPhoneVerified: customer.isPhoneVerified,
        addresses: customer.addresses,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error("Customer Get Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
}

/* --------------------------------------------------
   UPDATE PROFILE
   PATCH /api/customer-auth/me
   Auth: Customer JWT
   Body: { name }
-------------------------------------------------- */
export async function customerUpdateProfile(req, res) {
  try {
    const { name } = req.body;

    const errors = validateProfileUpdate({ name });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    const customer = await OnlineCustomer.findByIdAndUpdate(
      req.customer._id,
      { name: name.trim() },
      { new: true }
    );

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isPhoneVerified: customer.isPhoneVerified,
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    console.error("Customer Update Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

/* --------------------------------------------------
   ADD ADDRESS
   POST /api/customer-auth/addresses
   Auth: Customer JWT
   Body: { label, fullAddress, houseNumber, landmark, city, state, pincode, latitude, longitude, isDefault }
-------------------------------------------------- */
export async function customerAddAddress(req, res) {
  try {
    const addressErrors = validateAddress(req.body);
    if (addressErrors.length > 0) {
      return res.status(400).json({ message: addressErrors[0] });
    }

    const customer = await OnlineCustomer.findById(req.customer._id);

    const newAddress = {
      label: req.body.label || "Home",
      fullAddress: req.body.fullAddress.trim(),
      houseNumber: req.body.houseNumber || "",
      landmark: req.body.landmark || "",
      city: req.body.city || "",
      state: req.body.state || "",
      pincode: req.body.pincode || "",
      latitude: req.body.latitude ?? null,
      longitude: req.body.longitude ?? null,
      isDefault: req.body.isDefault || false,
    };

    // If this is set as default, unset others
    if (newAddress.isDefault) {
      customer.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default
    if (customer.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    customer.addresses.push(newAddress);
    await customer.save();

    res.status(201).json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Customer Add Address Error:", error.message);
    return res.status(500).json({ message: "Failed to add address" });
  }
}

/* --------------------------------------------------
   UPDATE ADDRESS
   PATCH /api/customer-auth/addresses/:addressId
   Auth: Customer JWT
-------------------------------------------------- */
export async function customerUpdateAddress(req, res) {
  try {
    const { addressId } = req.params;
    const customer = await OnlineCustomer.findById(req.customer._id);

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Validate if fullAddress is being changed
    if (req.body.fullAddress !== undefined) {
      const addressErrors = validateAddress(req.body);
      if (addressErrors.length > 0) {
        return res.status(400).json({ message: addressErrors[0] });
      }
    }

    // Update fields
    const updatableFields = [
      "label", "fullAddress", "houseNumber", "landmark",
      "city", "state", "pincode", "latitude", "longitude", "isDefault",
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        address[field] = req.body[field];
      }
    }

    // If setting as default, unset others
    if (req.body.isDefault === true) {
      customer.addresses.forEach((addr) => {
        if (addr._id.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    await customer.save();

    res.status(200).json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Customer Update Address Error:", error.message);
    return res.status(500).json({ message: "Failed to update address" });
  }
}

/* --------------------------------------------------
   DELETE ADDRESS
   DELETE /api/customer-auth/addresses/:addressId
   Auth: Customer JWT
-------------------------------------------------- */
export async function customerDeleteAddress(req, res) {
  try {
    const { addressId } = req.params;
    const customer = await OnlineCustomer.findById(req.customer._id);

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    customer.addresses.pull(addressId);

    // If deleted address was default, set first remaining as default
    if (wasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("Customer Delete Address Error:", error.message);
    return res.status(500).json({ message: "Failed to delete address" });
  }
}

/* --------------------------------------------------
   LOGOUT
   POST /api/customer-auth/logout
-------------------------------------------------- */
export function customerLogout(req, res) {
  res.clearCookie("customer_jwt");
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
}
