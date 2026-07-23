import api from './api'

export const shopService = {
  getShopDetails: (shopId) => api.get(`/public/shops/${shopId}`),

  getShopProducts: (shopId, params) =>
    api.get(`/public/shops/${shopId}/products`, { params }),

  getShopCategories: (shopId) =>
    api.get(`/public/shops/${shopId}/categories`),

  searchProducts: (shopId, query) =>
    api.get(`/public/shops/${shopId}/products`, { params: { search: query } }),
}
