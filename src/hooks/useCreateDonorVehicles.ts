import { useMutation, useQueryClient } from '@tanstack/react-query'
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

// tag_code has no DB-side default (unlike inventory_item.sku) — the mobile app's own
// convention is client-generated "DV-0001", "DV-0002", ... (zero-padded, sequential).
// We mirror that here since this repo has no migrations to confirm a different scheme.
//
// Numeric max is computed client-side rather than via `order by tag_code desc limit 1` —
// text ordering only matches numeric ordering when every row uses the same zero-padding
// width, which isn't guaranteed for codes written by the mobile app.
async function nextTagNumber(): Promise<number> {
  const { data, error } = await supabase.from('donor_vehicle').select('tag_code')
  if (error) throw error

  let max = 0
  for (const row of data ?? []) {
    const match = row.tag_code?.match(/^DV-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

function buildTagCodes(startNumber: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `DV-${String(startNumber + index).padStart(4, '0')}`)
}

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

      let tagCodes = buildTagCodes(await nextTagNumber(), input.quantity)
      let result = await supabase.from('donor_vehicle').insert(buildRows(tagCodes)).select(VEHICLE_APPLICATION_SELECT)

      // tag_code is unique — a concurrent create can collide with our computed range. Retry once.
      if (result.error?.code === '23505') {
        tagCodes = buildTagCodes(await nextTagNumber(), input.quantity)
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
