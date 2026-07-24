import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import OnlineProfile from "../models/OnlineProfile.js";

/* =========================================================
   PUBLIC SHOP CONTROLLER
   - No authentication required
   - Used by customers scanning QR codes
========================================================= */

/* --------------------------------------------------
   GET SHOP INFO
   GET /api/public/shops/:shopId
-------------------------------------------------- */
export async function getPublicShopInfo(req, res) {
  try {
    const { shopId } = req.params;

    const shop = await Shop.findById(shopId).select(
      "shopName ownerName storeCategory address upiId gstNumber"
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // If shop address doesn't have coordinates, try OnlineProfile
    const shopObj = shop.toObject();
    if (!shopObj.address?.latitude || !shopObj.address?.longitude) {
      const profile = await OnlineProfile.findOne({ shop: shopId })
        .select("address.latitude address.longitude")
        .lean();
      if (profile?.address?.latitude && profile?.address?.longitude) {
        shopObj.address = shopObj.address || {};
        shopObj.address.latitude = profile.address.latitude;
        shopObj.address.longitude = profile.address.longitude;
      }
    }

    res.status(200).json({
      success: true,
      shop: shopObj,
    });
  } catch (error) {
    console.error("Get Public Shop Info Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch shop info" });
  }
}

/* --------------------------------------------------
   GET SHOP PRODUCTS (PUBLIC)
   GET /api/public/shops/:shopId/products

   Query params:
   - page (default: 1)
   - limit (default: 20)
   - search (string, searches name)
   - category (string)
   - availability ("in_stock" | "all", default: "all")
-------------------------------------------------- */
export async function getPublicShopProducts(req, res) {
  try {
    const { shopId } = req.params;

    // Verify shop exists
    const shopExists = await Shop.exists({ _id: shopId });
    if (!shopExists) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      availability = "all",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {
      shopId,
      isActive: true,
    };

    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    if (category.trim()) {
      filter.category = { $regex: `^${category.trim()}$`, $options: "i" };
    }

    if (availability === "in_stock") {
      filter.quantity = { $gt: 0 };
    }

    // Fetch products
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("name category unit price quantity variants barcode isTrackable")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Map products for public consumption (hide internal fields)
    const publicProducts = products.map((p) => {
      const productPrice = typeof p.price === 'object' ? p.price?.sellingPrice : p.price;
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        price: productPrice ?? 0,
        quantity: p.isTrackable ? p.quantity : null,
        inStock: p.isTrackable ? p.quantity > 0 : true,
        variants: (p.variants || [])
          .filter((v) => v.isActive)
          .map((v) => {
            const variantPrice = typeof v.price === 'object' ? v.price?.sellingPrice : v.price;
            return {
              _id: v._id,
              name: v.name,
              price: variantPrice ?? 0,
              quantity: p.isTrackable ? v.quantity : null,
              inStock: p.isTrackable ? v.quantity > 0 : true,
            };
          }),
      };
    });

    res.status(200).json({
      success: true,
      products: publicProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get Public Shop Products Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
}

/* --------------------------------------------------
   GET SHOP CATEGORIES (PUBLIC)
   GET /api/public/shops/:shopId/categories
-------------------------------------------------- */
export async function getPublicShopCategories(req, res) {
  try {
    const { shopId } = req.params;

    const shopExists = await Shop.exists({ _id: shopId });
    if (!shopExists) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const categories = await Product.distinct("category", {
      shopId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      categories: categories.sort(),
    });
  } catch (error) {
    console.error("Get Public Shop Categories Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
}
