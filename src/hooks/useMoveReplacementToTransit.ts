import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface MoveReplacementToTransitInput {
  id: string
  lrNumber: string
  transportCompany: string
}

export function useMoveReplacementToTransit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, lrNumber, transportCompany }: MoveReplacementToTransitInput) => {
      const { error } = await supabase
        .from('replacement')
        .update({ status: 'in_transit', lr_number: lrNumber, courier_company: transportCompany })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replacements'] })
    },
  })
}
