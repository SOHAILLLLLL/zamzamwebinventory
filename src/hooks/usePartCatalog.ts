import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PartCatalog } from '../types/db'

// Reference table — small enough to fetch once and filter client-side, same rationale as
// useInventoryItems/useDonorVehicles.
const FETCH_CAP = 5000

export function usePartCatalog() {
  return useQuery({
    queryKey: ['part-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_catalog')
        .select('id, part_type, category, primary_oem_number, description, is_electrical, side, superseded_by, created_at')
        .order('part_type', { ascending: true })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as PartCatalog[]
    },
    staleTime: 5 * 60_000,
  })
}
