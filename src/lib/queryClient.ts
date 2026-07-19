import { QueryClient } from '@tanstack/react-query'

// Extracted to its own module (rather than living inline in main.tsx) so non-component
// code — like the background car-upload queue — can invalidate queries after it finishes
// work outside the React tree.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
