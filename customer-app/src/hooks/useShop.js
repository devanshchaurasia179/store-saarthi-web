import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { shopService } from '../services/shopService'

export function useShopDetails(shopId) {
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopService.getShopDetails(shopId).then((res) => res.data.shop),
    enabled: !!shopId,
  })
}

export function useShopCategories(shopId) {
  return useQuery({
    queryKey: ['shop-categories', shopId],
    queryFn: () =>
      shopService.getShopCategories(shopId).then((res) => res.data.categories),
    enabled: !!shopId,
  })
}

export function useShopProducts(shopId, { category = '', search = '' } = {}) {
  return useInfiniteQuery({
    queryKey: ['shop-products', shopId, category, search],
    queryFn: ({ pageParam = 1 }) =>
      shopService
        .getShopProducts(shopId, {
          page: pageParam,
          limit: 20,
          category,
          search,
          availability: 'all',
        })
        .then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    enabled: !!shopId,
  })
}
