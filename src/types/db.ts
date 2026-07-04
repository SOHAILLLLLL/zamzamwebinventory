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
