import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadPhotos } from '../lib/photos'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface CreateInventoryItemsInput {
  donorVehicleId: string
  partCatalogId: string
  itemName: string
  partNumber: string | null
  conditionGrade: 'A' | 'B' | 'C'
  tested: boolean | null
  testNotes: string | null
  pairedSetRef: string | null
  shelfLocation: string
  price: number | null
  quantity: number
  photoFiles: File[]
}

export interface CreatedInventoryItem {
  id: string
  sku: string
}

export function useCreateInventoryItems() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateInventoryItemsInput): Promise<CreatedInventoryItem[]> => {
      const photos = input.photoFiles.length > 0 ? await uploadPhotos('part-photos', input.photoFiles) : []

      const rows = Array.from({ length: input.quantity }, () => ({
        donor_vehicle_id: input.donorVehicleId,
        part_catalog_id: input.partCatalogId,
        item_name: input.itemName,
        part_number: input.partNumber,
        condition_grade: input.conditionGrade,
        tested: input.tested,
        test_notes: input.testNotes,
        paired_set_ref: input.pairedSetRef,
        shelf_location: input.shelfLocation,
        price: input.price,
        photos,
        created_by: session?.user.id ?? null,
      }))

      const { data, error } = await supabase.from('inventory_item').insert(rows).select('id, sku')
      if (error) throw error
      return (data ?? []) as CreatedInventoryItem[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
