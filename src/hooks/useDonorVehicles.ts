import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DonorVehicleListItem } from '../types/db'

const FETCH_CAP = 5000

export function useDonorVehicles() {
  return useQuery({
    queryKey: ['donor-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donor_vehicle')
        .select(
          `*,
          vehicle_application:vehicle_application_id ( id, make, model, variant, generation_code, year_from, year_to, body_style )`,
        )
        .eq('in_fleet', true)
        .order('created_at', { ascending: false })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as unknown as DonorVehicleListItem[]
    },
    staleTime: 30_000,
  })
}
