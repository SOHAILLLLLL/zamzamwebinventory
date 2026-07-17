import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types/db'

// Same fetch-once-filter-client-side rationale as useDonorVehicles/usePartCatalog.
const FETCH_CAP = 5000

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer')
        .select('*')
        .order('name', { ascending: true })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as Customer[]
    },
    staleTime: 30_000,
  })
}
