// Hand-written to match supabase/migrations reality captured in DBREFRENCE screenshots
// (no `supabase gen types` access from this environment — regenerate and replace once CLI access exists).

export interface VehicleApplication {
  id: string
  make: string | null
  model: string | null
  variant: string | null
  year_from: number | null
  year_to: number | null
  fuel_type: string | null
  transmission: string | null
  generation_code: string | null
  facelift_lci: string | null
  body_style: string | null
  platform_code: string | null
  created_at: string
}

export interface DonorVehicle {
  id: string
  tag_code: string
  rc_number: string | null
  vin: string | null
  vehicle_application_id: string | null
  source: string | null
  purchase_price: number | null
  purchase_date: string | null
  scrap_cert_ref: string | null
  odometer: number | null
  photos: string[]
  status: string
  scrap_value: number | null
  created_by: string | null
  created_at: string
  in_fleet: boolean
}

export interface PartCatalog {
  id: string
  part_type: string | null
  category: string | null
  primary_oem_number: string | null
  description: string | null
  is_electrical: boolean | null
  created_at: string
  side: string | null
  superseded_by: string | null
}

export interface InventoryItem {
  id: string
  sku: string
  part_catalog_id: string | null
  donor_vehicle_id: string | null
  condition_grade: string | null
  tested: boolean | null
  test_notes: string | null
  paired_set_ref: string | null
  price: number | null
  shelf_location: string | null
  photos: string[]
  status: string
  created_by: string | null
  created_at: string
  is_bk: boolean
  item_name: string
  part_number: string | null
}

export interface Fitment {
  part_catalog_id: string
  vehicle_application_id: string
}

export interface Customer {
  id: string
  name: string
  mobile: string | null
  state: string | null
  city: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export interface Sale {
  id: string
  customer_id: string | null
  sale_date: string
  is_paid: boolean
  is_carrying: boolean
  transport_company: string | null
  lr_number: string | null
  notes: string | null
  total_amount: number
  is_cancelled: boolean
  deleted_at: string | null
  is_delivered: boolean
  is_ignored: boolean
  remind_after: string | null
  created_by: string | null
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  inventory_item_id: string | null
  description: string
  quantity: number
  unit_price: number
  notes: string | null
  created_at: string
}

export interface Replacement {
  id: string
  sale_id: string
  customer_id: string | null
  customer_name: string
  customer_mobile: string | null
  item_name: string
  item_code: string | null
  reason: string
  status: string
  courier_company: string | null
  lr_number: string | null
  created_by: string | null
  created_at: string
}

export type CustomerSummary = Pick<Customer, 'id' | 'name' | 'mobile' | 'state' | 'city' | 'address'>

export interface SaleItemListItem extends SaleItem {
  inventory_item: Pick<InventoryItem, 'id' | 'sku' | 'item_name' | 'shelf_location' | 'status'> | null
}

export interface SaleListItem extends Sale {
  customer: CustomerSummary | null
  sale_item: SaleItemListItem[]
}

export type VehicleApplicationSummary = Pick<
  VehicleApplication,
  'id' | 'make' | 'model' | 'variant' | 'generation_code' | 'year_from' | 'year_to' | 'body_style'
>

export type PartCatalogSummary = Pick<
  PartCatalog,
  'id' | 'part_type' | 'category' | 'primary_oem_number' | 'description' | 'side'
>

export interface InventoryListItem extends InventoryItem {
  donor_vehicle:
    | (Pick<DonorVehicle, 'id' | 'tag_code' | 'status'> & {
        vehicle_application: VehicleApplicationSummary | null
      })
    | null
  part_catalog: PartCatalogSummary | null
}

export interface DonorVehicleListItem extends DonorVehicle {
  vehicle_application: VehicleApplicationSummary | null
}
