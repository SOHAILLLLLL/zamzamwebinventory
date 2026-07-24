import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSetSaleDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, delivered }: { id: string; delivered: boolean }) => {
      const { error } = await supabase.from('sale').update({ is_delivered: delivered }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}
