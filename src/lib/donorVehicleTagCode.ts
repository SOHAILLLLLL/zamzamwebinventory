import { supabase } from './supabase'

// tag_code has no DB-side default (unlike inventory_item.sku) — the mobile app's own
// convention is client-generated "DV-0001", "DV-0002", ... (zero-padded, sequential).
//
// Numeric max is computed client-side rather than via `order by tag_code desc limit 1` —
// text ordering only matches numeric ordering when every row uses the same zero-padding
// width, which isn't guaranteed for codes written by the mobile app.
export async function nextDonorVehicleTagNumber(): Promise<number> {
  const { data, error } = await supabase.from('donor_vehicle').select('tag_code')
  if (error) throw error

  let max = 0
  for (const row of data ?? []) {
    const match = row.tag_code?.match(/^DV-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

export function buildDonorVehicleTagCodes(startNumber: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `DV-${String(startNumber + index).padStart(4, '0')}`)
}
