import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DonorVehicleListItem } from '../types/db'

export function useDonorVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['donor-vehicle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donor_vehicle')
        .select(
          `*,
          vehicle_application:vehicle_application_id ( id, make, model, variant, generation_code, year_from, year_to, body_style )`,
        )
        .eq('id', id as string)
        .single()

      if (error) throw error
      return data as unknown as DonorVehicleListItem
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}
