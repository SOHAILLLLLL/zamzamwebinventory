import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { InventoryListItem } from '../types/db'

// Powers the routed /items/:sku detail page, which must work on a fresh page load
// (direct link, QR scan) with no list query already warm — unlike useInventoryItems,
// this fetches exactly one row. maybeSingle() so "not found" is representable data
// (null), not an error.
export function useInventoryItemBySku(sku: string | undefined) {
  return useQuery({
    queryKey: ['inventory-item', sku],
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
        .eq('sku', sku as string)
        .maybeSingle()

      if (error) throw error
      return data as unknown as InventoryListItem | null
    },
    enabled: !!sku,
    staleTime: 30_000,
  })
}
