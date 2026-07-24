import OnlineProfile from "../models/OnlineProfile.js";
import Shop from "../models/Shop.js";

/* =========================================================
   ONLINE PROFILE CONTROLLER
   - Authenticated shop routes
   - CRUD for the shop's online profile
========================================================= */

/* --------------------------------------------------
   GET ONLINE PROFILE
   GET /api/online-profile
-------------------------------------------------- */
export async function getOnlineProfile(req, res) {
  try {
    const shopId = req.user._id;

    let profile = await OnlineProfile.findOne({ shop: shopId }).lean();

    // Always fetch shop data to provide defaults/greyed fields
    const shop = await Shop.findById(shopId).select(
      "shopName ownerName mobileNumber upiId address"
    ).lean();

    if (!profile) {
      return res.status(200).json({
        success: true,
        profile: null,
        defaults: {
          storeName: shop?.shopName || "",
          ownerName: shop?.ownerName || "",
          mobileNumber: shop?.mobileNumber || "",
          upiId: shop?.upiId || "",
          address: {
            street: shop?.address?.street || "",
            city: shop?.address?.city || "",
            state: shop?.address?.state || "",
            pincode: shop?.address?.pincode || "",
            latitude: shop?.address?.latitude || null,
            longitude: shop?.address?.longitude || null,
          },
        },
        message: "Online profile not set up yet",
      });
    }

    // Return profile along with shop defaults (for greying out fields)
    res.status(200).json({
      success: true,
      profile,
      defaults: {
        storeName: shop?.shopName || "",
        ownerName: shop?.ownerName || "",
        mobileNumber: shop?.mobileNumber || "",
        upiId: shop?.upiId || "",
        address: {
          street: shop?.address?.street || "",
          city: shop?.address?.city || "",
          state: shop?.address?.state || "",
          pincode: shop?.address?.pincode || "",
          latitude: shop?.address?.latitude || null,
          longitude: shop?.address?.longitude || null,
        },
      },
    });
  } catch (error) {
    console.error("Get Online Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch online profile" });
  }
}

/* --------------------------------------------------
   CREATE / SETUP ONLINE PROFILE
   POST /api/online-profile
-------------------------------------------------- */
export async function createOnlineProfile(req, res) {
  try {
    const shopId = req.user._id;

    // Check if already exists
    const existing = await OnlineProfile.findOne({ shop: shopId });
    if (existing) {
      return res.status(400).json({
        message: "Online profile already exists. Use PUT to update.",
      });
    }

    const {
      storeName,
      ownerName,
      storeDescription,
      storeLogo,
      storeBanner,
      mobileNumber,
      whatsappNumber,
      email,
      address,
      deliveryCharges,
      freeDeliveryAbove,
      minimumOrderAmount,
      deliveryRadius,
      estimatedDeliveryTime,
      deliverySlots,
      isDeliveryAvailable,
      isPickupAvailable,
      acceptedPaymentMethods,
      upiId,
      businessHours,
    } = req.body;

    // storeName and mobileNumber are required
    if (!storeName || !mobileNumber) {
      return res.status(400).json({
        message: "Store name and mobile number are required",
      });
    }

    const profile = await OnlineProfile.create({
      shop: shopId,
      storeName,
      ownerName: ownerName || req.user.ownerName || "",
      storeDescription: storeDescription || "",
      storeLogo: storeLogo || "",
      storeBanner: storeBanner || "",
      mobileNumber,
      whatsappNumber: whatsappNumber || "",
      email: email || "",
      address: address || {},
      deliveryCharges: deliveryCharges || 0,
      freeDeliveryAbove: freeDeliveryAbove || 0,
      minimumOrderAmount: minimumOrderAmount || 0,
      deliveryRadius: deliveryRadius || 5,
      estimatedDeliveryTime: estimatedDeliveryTime || "",
      deliverySlots: deliverySlots || [],
      isDeliveryAvailable: isDeliveryAvailable ?? true,
      isPickupAvailable: isPickupAvailable ?? false,
      acceptedPaymentMethods: acceptedPaymentMethods || ["COD"],
      upiId: upiId || "",
      businessHours: businessHours || {},
      isProfileComplete: true,
    });

    res.status(201).json({
      success: true,
      message: "Online profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create Online Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to create online profile" });
  }
}

/* --------------------------------------------------
   UPDATE ONLINE PROFILE
   PUT /api/online-profile
-------------------------------------------------- */
export async function updateOnlineProfile(req, res) {
  try {
    const shopId = req.user._id;

    const profile = await OnlineProfile.findOne({ shop: shopId });
    if (!profile) {
      return res.status(404).json({
        message: "Online profile not found. Create one first.",
      });
    }

    // Updatable fields
    const updatableFields = [
      "storeName",
      "ownerName",
      "storeDescription",
      "storeLogo",
      "storeBanner",
      "mobileNumber",
      "whatsappNumber",
      "email",
      "address",
      "deliveryCharges",
      "freeDeliveryAbove",
      "minimumOrderAmount",
      "deliveryRadius",
      "estimatedDeliveryTime",
      "deliverySlots",
      "isOnlineOrderingEnabled",
      "isDeliveryAvailable",
      "isPickupAvailable",
      "acceptedPaymentMethods",
      "upiId",
      "businessHours",
      "isStoreOnline",
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: "Online profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update Online Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to update online profile" });
  }
}

/* --------------------------------------------------
   TOGGLE STORE ONLINE STATUS
   PATCH /api/online-profile/toggle-status
-------------------------------------------------- */
export async function toggleStoreOnlineStatus(req, res) {
  try {
    const shopId = req.user._id;

    const profile = await OnlineProfile.findOne({ shop: shopId });
    if (!profile) {
      return res.status(404).json({ message: "Online profile not found" });
    }

    profile.isStoreOnline = !profile.isStoreOnline;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Store is now ${profile.isStoreOnline ? "online" : "offline"}`,
      isStoreOnline: profile.isStoreOnline,
    });
  } catch (error) {
    console.error("Toggle Store Status Error:", error.message);
    return res.status(500).json({ message: "Failed to toggle store status" });
  }
}

/* --------------------------------------------------
   GET PUBLIC ONLINE PROFILE (for customers)
   GET /api/public/shops/:shopId/online-profile
-------------------------------------------------- */
export async function getPublicOnlineProfile(req, res) {
  try {
    const { shopId } = req.params;

    const profile = await OnlineProfile.findOne({ shop: shopId })
      .select(
        "storeName ownerName storeDescription storeLogo storeBanner mobileNumber whatsappNumber address deliveryCharges freeDeliveryAbove minimumOrderAmount deliveryRadius estimatedDeliveryTime deliverySlots isOnlineOrderingEnabled isDeliveryAvailable isPickupAvailable acceptedPaymentMethods upiId businessHours isStoreOnline"
      )
      .lean();

    if (!profile) {
      return res.status(404).json({ message: "Online profile not found" });
    }

    if (!profile.isStoreOnline) {
      return res.status(200).json({
        success: true,
        profile: {
          storeName: profile.storeName,
          isStoreOnline: false,
        },
        message: "Store is currently offline",
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get Public Online Profile Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch online profile" });
  }
}
