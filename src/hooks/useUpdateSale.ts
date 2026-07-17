import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { SaleLineInput } from './useCreateSale'

export interface UpdateSaleInput {
  id: string
  // The inventory_item_ids linked to this sale before the edit — needed to diff against the
  // new line set so removed items go back to 'available' and newly-added ones flip to 'sold'.
  previousInventoryItemIds: string[]
  customerId: string | null
  saleDate: string
  isPaid: boolean
  isCarrying: boolean
  transportCompany: string | null
  lrNumber: string | null
  notes: string | null
  lines: SaleLineInput[]
}

export function useUpdateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateSaleInput): Promise<void> => {
      const totalAmount = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

      const { error: updateError } = await supabase
        .from('sale')
        .update({
          customer_id: input.customerId,
          sale_date: input.saleDate,
          is_paid: input.isPaid,
          is_carrying: input.isCarrying,
          transport_company: input.isCarrying ? null : input.transportCompany,
          lr_number: input.isCarrying ? null : input.lrNumber,
          notes: input.notes,
          total_amount: totalAmount,
        })
        .eq('id', input.id)
      if (updateError) throw updateError

      // No partial-update API for line items here — replace the whole set in one delete +
      // insert rather than trying to diff individual sale_item rows.
      const { error: deleteItemsError } = await supabase.from('sale_item').delete().eq('sale_id', input.id)
      if (deleteItemsError) throw deleteItemsError

      const { error: insertItemsError } = await supabase.from('sale_item').insert(
        input.lines.map((line) => ({
          sale_id: input.id,
          inventory_item_id: line.inventoryItemId,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          notes: line.notes,
        })),
      )
      if (insertItemsError) throw insertItemsError

      const newIds = new Set(input.lines.map((line) => line.inventoryItemId).filter((id): id is string => !!id))
      const previousIds = new Set(input.previousInventoryItemIds)

      const toMarkSold = [...newIds].filter((id) => !previousIds.has(id))
      const toRevertAvailable = [...previousIds].filter((id) => !newIds.has(id))

      if (toMarkSold.length > 0) {
        const { error } = await supabase.from('inventory_item').update({ status: 'sold' }).in('id', toMarkSold)
        if (error) throw error
      }
      if (toRevertAvailable.length > 0) {
        const { error } = await supabase.from('inventory_item').update({ status: 'available' }).in('id', toRevertAvailable)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
