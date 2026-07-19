import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildDonorVehicleTagCodes, nextDonorVehicleTagNumber } from '../lib/donorVehicleTagCode'
import { uploadPhotos } from '../lib/photos'
import { supabase } from '../lib/supabase'
import type { DonorVehicleListItem } from '../types/db'
import { useAuth } from './useAuth'

export type DonorVehicleSource = 'insurance_auction' | 'rvsf' | 'walk_in' | 'trade_purchase' | 'other'

export interface CreateDonorVehiclesInput {
  vehicleApplicationId: string
  source: DonorVehicleSource | null
  purchasePrice: number | null
  purchaseDate: string | null
  odometer: number | null
  // Only applied when quantity is 1 — a real VIN/RC number is unique per physical
  // vehicle, so a batch of "identical" intake rows must leave these blank.
  rcNumber: string | null
  vin: string | null
  quantity: number
  photoFiles: File[]
}

const VEHICLE_APPLICATION_SELECT =
  '*, vehicle_application:vehicle_application_id ( id, make, model, variant, generation_code, year_from, year_to, body_style )'

export function useCreateDonorVehicles() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateDonorVehiclesInput): Promise<DonorVehicleListItem[]> => {
      const photos = input.photoFiles.length > 0 ? await uploadPhotos('car-photos', input.photoFiles) : []

      function buildRows(tagCodes: string[]) {
        return tagCodes.map((tagCode) => ({
          tag_code: tagCode,
          vehicle_application_id: input.vehicleApplicationId,
          source: input.source,
          purchase_price: input.purchasePrice,
          purchase_date: input.purchaseDate,
          odometer: input.odometer,
          rc_number: input.quantity === 1 ? input.rcNumber : null,
          vin: input.quantity === 1 ? input.vin : null,
          photos,
          created_by: session?.user.id ?? null,
        }))
      }

      let tagCodes = buildDonorVehicleTagCodes(await nextDonorVehicleTagNumber(), input.quantity)
      let result = await supabase.from('donor_vehicle').insert(buildRows(tagCodes)).select(VEHICLE_APPLICATION_SELECT)

      // tag_code is unique — a concurrent create can collide with our computed range. Retry once.
      if (result.error?.code === '23505') {
        tagCodes = buildDonorVehicleTagCodes(await nextDonorVehicleTagNumber(), input.quantity)
        result = await supabase.from('donor_vehicle').insert(buildRows(tagCodes)).select(VEHICLE_APPLICATION_SELECT)
      }

      if (result.error) throw result.error
      return (result.data ?? []) as unknown as DonorVehicleListItem[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-vehicles'] })
    },
  })
}
