import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Which part_catalog entries are known to fit a given vehicle_application, via the
// fitment join table. Used to prioritize likely parts when adding inventory for a vehicle —
// falls back to the full catalog when a vehicle has no fitment rows (reference data is
// necessarily incomplete).
export function useFitment(vehicleApplicationId: string | null) {
  return useQuery({
    queryKey: ['fitment', vehicleApplicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fitment')
        .select('part_catalog_id')
        .eq('vehicle_application_id', vehicleApplicationId as string)

      if (error) throw error
      return new Set((data ?? []).map((row) => row.part_catalog_id as string))
    },
    enabled: !!vehicleApplicationId,
    staleTime: 5 * 60_000,
  })
}
