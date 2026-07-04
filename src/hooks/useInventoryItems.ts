import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { InventoryListItem } from '../types/db'

// Catalog size is small enough (low hundreds/thousands of parts for a single yard) to fetch
// once and let the UI filter/sort/chunk-render client-side — see InventoryPage. Revisit with
// server-side pagination if this table grows past ~5k rows.
const FETCH_CAP = 5000

export function useInventoryItems() {
  return useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_item')
        .select(
          `*,
          donor_vehicle:donor_vehicle_id (
            id, tag_code, status,
            vehicle_application:vehicle_application_id ( id, make, model, variant, generation_code, year_from, year_to, body_style )
          ),
          part_catalog:part_catalog_id ( id, part_type, category, primary_oem_number, description, side )`,
        )
        .order('created_at', { ascending: false })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as unknown as InventoryListItem[]
    },
    staleTime: 30_000,
  })
}
