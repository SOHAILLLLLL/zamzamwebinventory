import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SaleListItem } from '../types/db'

const FETCH_CAP = 5000

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale')
        .select(
          `*,
          customer:customer_id ( id, name, mobile, state, city, address ),
          sale_item ( *, inventory_item:inventory_item_id ( id, sku, item_name, shelf_location, status ) )`,
        )
        // deleted_at marks a soft-deleted sale — never show those in normal views.
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as unknown as SaleListItem[]
    },
    staleTime: 15_000,
  })
}
