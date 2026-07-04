import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export class DeleteBlockedError extends Error {}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, photos }: { id: string; photos: string[] }) => {
      const { count, error: saleCheckError } = await supabase
        .from('sale_item')
        .select('id', { count: 'exact', head: true })
        .eq('inventory_item_id', id)

      if (saleCheckError) throw saleCheckError
      if (count && count > 0) {
        throw new DeleteBlockedError(
          `This item is part of ${count} recorded sale${count === 1 ? '' : 's'} and can't be deleted.`,
        )
      }

      if (photos.length > 0) {
        const { error: storageError } = await supabase.storage.from('part-photos').remove(photos)
        if (storageError) throw storageError
      }

      const { error: deleteError } = await supabase.from('inventory_item').delete().eq('id', id)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
