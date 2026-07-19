import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Replacement } from '../types/db'

const FETCH_CAP = 5000

export function useReplacements() {
  return useQuery({
    queryKey: ['replacements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('replacement')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(FETCH_CAP)

      if (error) throw error
      return (data ?? []) as Replacement[]
    },
    staleTime: 15_000,
  })
}
