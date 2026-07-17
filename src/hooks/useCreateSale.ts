import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Sale } from '../types/db'
import { useAuth } from './useAuth'

export interface SaleLineInput {
  inventoryItemId: string | null
  itemName: string | null
  sku: string | null
  description: string
  quantity: number
  unitPrice: number
  notes: string | null
  isReplacement: boolean
  replacementReason: string | null
}

export interface CreateSaleInput {
  customerId: string | null
  customerName: string | null
  customerMobile: string | null
  saleDate: string
  isPaid: boolean
  isCarrying: boolean
  transportCompany: string | null
  lrNumber: string | null
  notes: string | null
  lines: SaleLineInput[]
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateSaleInput): Promise<Sale> => {
      const totalAmount = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

      const { data: sale, error: saleError } = await supabase
        .from('sale')
        .insert({
          customer_id: input.customerId,
          sale_date: input.saleDate,
          is_paid: input.isPaid,
          is_carrying: input.isCarrying,
          transport_company: input.isCarrying ? null : input.transportCompany,
          lr_number: input.isCarrying ? null : input.lrNumber,
          notes: input.notes,
          total_amount: totalAmount,
          created_by: session?.user.id ?? null,
        })
        .select('*')
        .single()
      if (saleError) throw saleError

      const { error: itemsError } = await supabase.from('sale_item').insert(
        input.lines.map((line) => ({
          sale_id: sale.id,
          inventory_item_id: line.inventoryItemId,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          notes: line.notes,
        })),
      )
      // The sale header already exists at this point — no DB transaction spans these writes
      // (matches the mobile app's own behavior), so a failure here can leave an orphaned
      // empty sale. Surfacing the error immediately is the best available mitigation.
      if (itemsError) throw itemsError

      const inventoryIds = input.lines.map((line) => line.inventoryItemId).filter((id): id is string => !!id)
      if (inventoryIds.length > 0) {
        const { error: statusError } = await supabase
          .from('inventory_item')
          .update({ status: 'sold' })
          .in('id', inventoryIds)
        if (statusError) throw statusError
      }

      const replacementLines = input.lines.filter((line) => line.isReplacement && line.replacementReason?.trim())
      if (replacementLines.length > 0) {
        // Best-effort follow-up bookkeeping — a failure here does not roll back the sale,
        // which has already succeeded and been paid for by this point.
        const { error: replacementError } = await supabase.from('replacement').insert(
          replacementLines.map((line) => ({
            sale_id: sale.id,
            customer_id: input.customerId,
            customer_name: input.customerName || 'Walk-in',
            customer_mobile: input.customerMobile,
            item_name: line.itemName || line.description,
            item_code: line.sku,
            reason: line.replacementReason?.trim() ?? '',
            status: 'informing_customer',
            created_by: session?.user.id ?? null,
          })),
        )
        if (replacementError) {
          console.error('Replacement record insert failed (sale still succeeded):', replacementError)
        }
      }

      return sale as Sale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
