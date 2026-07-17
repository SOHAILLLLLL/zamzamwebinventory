import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useDeleteSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, inventoryItemIds }: { id: string; inventoryItemIds: string[] }) => {
      // Undo the sale's effect on stock before hiding it — otherwise a deleted sale still
      // leaves its parts permanently marked 'sold' with nothing that explains why.
      if (inventoryItemIds.length > 0) {
        const { error } = await supabase.from('inventory_item').update({ status: 'available' }).in('id', inventoryItemIds)
        if (error) throw error
      }

      // Soft delete — `sale.deleted_at` exists specifically so sale history (and anything
      // referencing it, like payments) isn't destroyed by removing a sale from view.
      const { error: deleteError } = await supabase
        .from('sale')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
