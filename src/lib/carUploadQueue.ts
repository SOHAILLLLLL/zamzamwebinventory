import { buildDonorVehicleTagCodes, nextDonorVehicleTagNumber } from './donorVehicleTagCode'
import { uploadPhotosTracked } from './photos'
import { queryClient } from './queryClient'
import type { DonorVehicleSource } from '../hooks/useCreateDonorVehicles'
import { supabase } from './supabase'

export interface CarUploadJobInput {
  vehicleApplicationId: string
  vehicleTitle: string
  source: DonorVehicleSource | null
  purchasePrice: number | null
  purchaseDate: string | null
  odometer: number | null
  rcNumber: string | null
  vin: string | null
  createdBy: string | null
  photoFiles: File[]
}

export type CarUploadJobStatus = 'uploading' | 'success' | 'error'

export interface CarUploadJob {
  id: string
  vehicleTitle: string
  thumbnailUrl: string | null
  status: CarUploadJobStatus
  uploadedCount: number
  totalCount: number
  errorMessage: string | null
}

const AUTO_DISMISS_MS = 2000

let jobs: CarUploadJob[] = []
const listeners = new Set<() => void>()
const successTimers = new Map<string, ReturnType<typeof setTimeout>>()

function emit() {
  for (const listener of listeners) listener()
}

export function subscribeCarUploadJobs(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCarUploadJobsSnapshot(): CarUploadJob[] {
  return jobs
}

function updateJob(id: string, patch: Partial<CarUploadJob>) {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...patch } : job))
  emit()
}

export function dismissCarUploadJob(id: string) {
  const timer = successTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    successTimers.delete(id)
  }
  const job = jobs.find((j) => j.id === id)
  if (job?.thumbnailUrl) URL.revokeObjectURL(job.thumbnailUrl)
  jobs = jobs.filter((j) => j.id !== id)
  emit()
}

export function enqueueCarUploadJob(input: CarUploadJobInput): string {
  const id = crypto.randomUUID()
  const thumbnailUrl = input.photoFiles[0] ? URL.createObjectURL(input.photoFiles[0]) : null

  jobs = [
    ...jobs,
    {
      id,
      vehicleTitle: input.vehicleTitle,
      thumbnailUrl,
      status: 'uploading',
      uploadedCount: 0,
      totalCount: input.photoFiles.length,
      errorMessage: null,
    },
  ]
  emit()

  void runCarUploadJob(id, input)
  return id
}

async function runCarUploadJob(id: string, input: CarUploadJobInput) {
  let uploadedPaths: string[] = []

  try {
    uploadedPaths =
      input.photoFiles.length > 0
        ? await uploadPhotosTracked('car-photos', input.photoFiles, (count) => updateJob(id, { uploadedCount: count }))
        : []

    const insertRow = (tagCode: string) => ({
      tag_code: tagCode,
      vehicle_application_id: input.vehicleApplicationId,
      source: input.source,
      purchase_price: input.purchasePrice,
      purchase_date: input.purchaseDate,
      odometer: input.odometer,
      rc_number: input.rcNumber,
      vin: input.vin,
      photos: uploadedPaths,
      created_by: input.createdBy,
    })

    let tagCode = buildDonorVehicleTagCodes(await nextDonorVehicleTagNumber(), 1)[0]
    let result = await supabase.from('donor_vehicle').insert(insertRow(tagCode)).select('id')

    // tag_code is unique — a concurrent create can collide with our computed value. Retry once.
    if (result.error?.code === '23505') {
      tagCode = buildDonorVehicleTagCodes(await nextDonorVehicleTagNumber(), 1)[0]
      result = await supabase.from('donor_vehicle').insert(insertRow(tagCode)).select('id')
    }

    if (result.error) throw result.error

    updateJob(id, { status: 'success' })
    void queryClient.invalidateQueries({ queryKey: ['donor-vehicles'] })

    const timer = setTimeout(() => dismissCarUploadJob(id), AUTO_DISMISS_MS)
    successTimers.set(id, timer)
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from('car-photos').remove(uploadedPaths).catch(() => {})
    }
    updateJob(id, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : "Couldn't add this vehicle. Try again.",
    })
  }
}
