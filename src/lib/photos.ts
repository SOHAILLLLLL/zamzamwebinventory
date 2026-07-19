import { supabase } from './supabase'

export type PhotoBucket = 'car-photos' | 'part-photos'

// Buckets are private — always resolve through the authenticated session, never getPublicUrl.
const SIGNED_URL_TTL_SECONDS = 60 * 60

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
// Sanity cap on the file the user picks, before compression — phone cameras routinely
// produce 8-15MB originals that compress down well under the bucket's own limit below.
const MAX_ORIGINAL_PHOTO_BYTES = 30 * 1024 * 1024
// Matches the part-photos/car-photos bucket's file_size_limit — enforced again after
// compression as a safety net in case a photo doesn't compress down far enough.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const COMPRESS_MAX_DIMENSION = 1600
const COMPRESS_JPEG_QUALITY = 0.82
// Small files aren't worth re-encoding — the quality loss isn't worth the byte savings.
const COMPRESS_SKIP_UNDER_BYTES = 400 * 1024

export function isSupportedPhotoFile(file: File): boolean {
  return ALLOWED_PHOTO_TYPES.has(file.type) && file.size <= MAX_ORIGINAL_PHOTO_BYTES
}

// Downscales to a max dimension and re-encodes as JPEG so yard photos (often full
// phone-camera resolution) don't ship multi-megabyte originals to storage. Falls back to
// the original file untouched if compression fails or doesn't actually help.
async function compressPhoto(file: File): Promise<File> {
  if (file.size <= COMPRESS_SKIP_UNDER_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', COMPRESS_JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^./]+$/, '')}.jpg`
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Like uploadPhotos, but reports progress as each file finishes and — since Promise.all
// gives no partial results on rejection — tracks which paths actually landed in storage so
// a caller with a longer-lived rollback contract (e.g. a background upload job) can clean
// up orphaned files immediately rather than leaking them on a partial failure.
export async function uploadPhotosTracked(
  bucket: PhotoBucket,
  files: File[],
  onProgress: (uploadedCount: number) => void,
): Promise<string[]> {
  const batchId = crypto.randomUUID()
  const uploaded: string[] = []
  let completed = 0

  const settled = await Promise.allSettled(
    files.map(async (file, index) => {
      const compressed = await compressPhoto(file)
      if (compressed.size > MAX_UPLOAD_BYTES) {
        throw new Error(`${file.name} is too large even after compression — try a smaller photo.`)
      }

      const extension = compressed.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${batchId}/${index}.${extension}`
      const { error } = await supabase.storage.from(bucket).upload(path, compressed, { contentType: compressed.type })
      if (error) throw error
      uploaded.push(path)
      completed += 1
      onProgress(completed)
    }),
  )

  const rejected = settled.find((entry): entry is PromiseRejectedResult => entry.status === 'rejected')
  if (rejected) {
    if (uploaded.length > 0) {
      await supabase.storage.from(bucket).remove(uploaded).catch(() => {})
    }
    throw rejected.reason instanceof Error ? rejected.reason : new Error('Photo upload failed.')
  }

  return uploaded
}

export async function uploadPhotos(bucket: PhotoBucket, files: File[]): Promise<string[]> {
  return uploadPhotosTracked(bucket, files, () => {})
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
