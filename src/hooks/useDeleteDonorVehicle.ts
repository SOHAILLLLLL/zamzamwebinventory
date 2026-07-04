import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DeleteBlockedError } from './useDeleteInventoryItem'

export function useDeleteDonorVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, photos }: { id: string; photos: string[] }) => {
      const { count, error: itemCheckError } = await supabase
        .from('inventory_item')
        .select('id', { count: 'exact', head: true })
        .eq('donor_vehicle_id', id)

      if (itemCheckError) throw itemCheckError
      if (count && count > 0) {
        throw new DeleteBlockedError(
          `This vehicle still has ${count} inventory item${count === 1 ? '' : 's'} logged against it and can't be deleted.`,
        )
      }

      if (photos.length > 0) {
        const { error: storageError } = await supabase.storage.from('car-photos').remove(photos)
        if (storageError) throw storageError
      }

      const { error: deleteError } = await supabase.from('donor_vehicle').delete().eq('id', id)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-vehicles'] })
    },
  })
}
