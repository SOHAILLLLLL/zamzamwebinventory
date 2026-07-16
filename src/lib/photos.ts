import { supabase } from './supabase'

export type PhotoBucket = 'car-photos' | 'part-photos'

// Buckets are private — always resolve through the authenticated session, never getPublicUrl.
const SIGNED_URL_TTL_SECONDS = 60 * 60

// Matches the part-photos/car-photos bucket's allowed_mime_types and file_size_limit config.
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_PHOTO_BYTES = 10 * 1024 * 1024

export function isSupportedPhotoFile(file: File): boolean {
  return ALLOWED_PHOTO_TYPES.has(file.type) && file.size <= MAX_PHOTO_BYTES
}

export async function uploadPhotos(bucket: PhotoBucket, files: File[]): Promise<string[]> {
  const batchId = crypto.randomUUID()
  return Promise.all(
    files.map(async (file, index) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${batchId}/${index}.${extension}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
      if (error) throw error
      return path
    }),
  )
}

export async function getSignedPhotoUrl(bucket: PhotoBucket, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

export async function getSignedPhotoUrls(bucket: PhotoBucket, paths: string[]): Promise<(string | null)[]> {
  if (paths.length === 0) return []
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return paths.map(() => null)
  return data.map((entry) => entry.signedUrl ?? null)
}
