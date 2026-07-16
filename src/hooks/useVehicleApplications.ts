import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { VehicleApplicationSummary } from '../types/db'

// Reference table — fetch once and filter client-side, same rationale as usePartCatalog.
const FETCH_CAP = 5000

export function useVehicleApplications() {
  return useQuery({
    queryKey: ['vehicle-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_application')
        .select('id, make, model, variant, generation_code, year_from, year_to, body_style')
        .order('make', { ascending: true })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as VehicleApplicationSummary[]
    },
    staleTime: 5 * 60_000,
  })
}
