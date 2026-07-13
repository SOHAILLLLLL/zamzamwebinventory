import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { InventoryItem } from '../types/db'

export type InventoryItemUpdate = Partial<
  Pick<
    InventoryItem,
    | 'item_name'
    | 'part_number'
    | 'condition_grade'
    | 'tested'
    | 'test_notes'
    | 'paired_set_ref'
    | 'price'
    | 'shelf_location'
    | 'status'
  >
>

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InventoryItemUpdate }) => {
      const { error } = await supabase.from('inventory_item').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
