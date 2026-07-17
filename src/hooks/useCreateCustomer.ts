import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types/db'

export interface CreateCustomerInput {
  name: string
  mobile: string | null
  state: string | null
  city: string | null
  address: string | null
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCustomerInput): Promise<Customer> => {
      const { data, error } = await supabase.from('customer').insert(input).select('*').single()
      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
